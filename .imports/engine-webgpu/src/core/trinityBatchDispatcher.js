import { CjsWebgpuEncodeState, DeriveBatchGroups } from "./batchGroups.js";

const MAX_GPU_SIZE_32 = 0xffffffff;

const TOPOLOGIES = Object.freeze({
  1: "point-list",
  2: "line-list",
  3: "line-strip",
  4: "triangle-list",
  5: "triangle-strip"
});

const PREPARED_BATCHES = new WeakMap();
const PREPARED_ACCUMULATORS = new WeakMap();
const PREPARED_BATCH_MAPS = new WeakMap();
const EMPTY_CONTEXT = Object.freeze({});

function fail(message)
{
  const error = new Error(`CjsWebgpuTrinityBatchDispatcher: ${message}`);
  error.code = "CJS_WEBGPU_TRINITY_BATCH_INVALID";
  throw error;
}

function gpuSize32(value, name, owner = "batch")
{
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_GPU_SIZE_32)
  {
    fail(`${owner} ${name} must be a GPUSize32 value`);
  }
  return value;
}

function signedOffset32(value, name)
{
  if (!Number.isSafeInteger(value) || value < -0x80000000 || value > 0x7fffffff)
  {
    fail(`resolved geometry draw ${name} must be a GPUSignedOffset32 value`);
  }
  return value;
}

function signedBaseVertex(value)
{
  const bits = gpuSize32(value, "baseVertexLocation");
  return bits > 0x7fffffff ? bits - 0x100000000 : bits;
}

function preparationContext(value)
{
  if (value === undefined) return EMPTY_CONTEXT;
  if (!value || typeof value !== "object" || Array.isArray(value))
  {
    fail("preparation context must be an object");
  }
  const context = { ...value };
  if (context.batchType !== undefined
    && (!Number.isInteger(context.batchType) || context.batchType < 0))
  {
    fail("preparation context batchType must be a non-negative integer");
  }
  return Object.freeze(context);
}

function geometryDraw(value, indexed)
{
  if (!value || typeof value !== "object" || Array.isArray(value))
  {
    fail("ResolveGeometry draw must be an object");
  }
  if (indexed)
  {
    return Object.freeze({
      indexCount: gpuSize32(value.indexCount, "indexCount", "resolved geometry draw"),
      instanceCount: gpuSize32(value.instanceCount, "instanceCount", "resolved geometry draw"),
      firstIndex: gpuSize32(value.firstIndex, "firstIndex", "resolved geometry draw"),
      baseVertex: signedOffset32(value.baseVertex, "baseVertex"),
      firstInstance: gpuSize32(value.firstInstance, "firstInstance", "resolved geometry draw")
    });
  }
  return Object.freeze({
    vertexCount: gpuSize32(value.vertexCount, "vertexCount", "resolved geometry draw"),
    instanceCount: gpuSize32(value.instanceCount, "instanceCount", "resolved geometry draw"),
    firstVertex: gpuSize32(value.firstVertex, "firstVertex", "resolved geometry draw"),
    firstInstance: gpuSize32(value.firstInstance, "firstInstance", "resolved geometry draw")
  });
}

function batchDraw(batch, indexed)
{
  const count = gpuSize32(batch.indexCountPerInstance, "indexCountPerInstance");
  const instanceCount = gpuSize32(batch.instanceCount, "instanceCount");
  const first = gpuSize32(batch.startIndexLocation, "startIndexLocation");
  const firstInstance = gpuSize32(batch.startInstanceLocation, "startInstanceLocation");
  if (indexed)
  {
    return Object.freeze({
      indexCount: count,
      instanceCount,
      firstIndex: first,
      baseVertex: signedBaseVertex(batch.baseVertexLocation),
      firstInstance
    });
  }
  return Object.freeze({
    vertexCount: count,
    instanceCount,
    firstVertex: first,
    firstInstance
  });
}

function pipelineRecipe(recipe, topology)
{
  if (!recipe || typeof recipe !== "object" || Array.isArray(recipe))
  {
    fail("ResolveMaterial must return a pipeline recipe");
  }
  const primitive = recipe.primitive ?? {};
  if (!primitive || typeof primitive !== "object" || Array.isArray(primitive))
  {
    fail("resolved pipeline primitive recipe must be an object");
  }
  if (primitive.topology !== undefined && primitive.topology !== topology)
  {
    fail(`batch topology ${topology} conflicts with resolved pipeline topology ${primitive.topology}`);
  }
  return {
    ...recipe,
    primitive: {
      ...primitive,
      topology
    }
  };
}

/**
 * Provisional engine-side adapter for the duck-typed `Tr2RenderBatch` shape.
 *
 * Trinity supplies transient CPU references and draw arguments. Injected
 * composition hooks resolve those references to WebGPU-owned material,
 * geometry, and binding objects without importing runtime-trinity here.
 */
export class CjsWebgpuTrinityBatchDispatcher
{
  #webgpu;

  #hooks;

  /**
   * @param {object} webgpu CjsWebgpuDevice-compatible boundary.
   * @param {object} hooks Backend composition hooks.
   * @param {Function} hooks.ResolveMaterial Resolves batch material to
   *   { pipeline, recipe, prepareOptions? }; receives immutable preparation
   *   context as its third argument.
   * @param {Function} hooks.ResolveGeometry Resolves geometrySource to
   *   { geometry, indexed, draw? }; a draw override supplies arguments derived
   *   from deferred geometry areas and realized buffer packing. Receives
   *   preparation context as its third argument.
   * @param {Function} hooks.ResolveBindings Resolves batch/object data to
   *   { uniformData, resources }; receives preparation context as its third
   *   argument.
   */
  constructor(webgpu, hooks = {})
  {
    for (const method of [
      "PreparePipeline",
      "CreateRenderPipeline",
      "CreateBindingSet",
      "CreateDraw",
      "EncodeDraw"
    ])
    {
      if (typeof webgpu?.[method] !== "function")
      {
        fail(`webgpu boundary requires ${method}`);
      }
    }
    for (const hook of [ "ResolveMaterial", "ResolveGeometry", "ResolveBindings" ])
    {
      if (typeof hooks?.[hook] !== "function")
      {
        fail(`composition hooks require ${hook}`);
      }
    }
    this.#webgpu = webgpu;
    this.#hooks = hooks;
  }

  /**
   * Resolves and validates one transient Trinity batch into a generation-bound
   * WebGPU draw. External geometry and resources remain owned by their
   * resolvers; the returned handle owns only its binding set.
   */
  async Prepare(batch, context = undefined)
  {
    const preparedContext = preparationContext(context);
    if (!batch || typeof batch !== "object") fail("batch must be an object");
    if (batch.material === null || batch.material === undefined) fail("batch material is required");
    if (batch.geometrySource === null || batch.geometrySource === undefined)
    {
      fail("batch geometrySource is required");
    }
    const topology = TOPOLOGIES[batch.topology];
    if (!topology) fail(`batch topology ${batch.topology} is unsupported`);

    const material = await this.#hooks.ResolveMaterial(batch.material, batch, preparedContext);
    if (!material || typeof material !== "object" || material.pipeline == null)
    {
      fail("ResolveMaterial must return a pipeline and recipe");
    }
    const geometry = await this.#hooks.ResolveGeometry(
      batch.geometrySource,
      batch,
      preparedContext
    );
    if (!geometry || typeof geometry !== "object" || geometry.geometry == null
      || typeof geometry.indexed !== "boolean")
    {
      fail("ResolveGeometry must return geometry and an indexed boolean");
    }
    const drawArguments = geometry.draw === undefined
      ? batchDraw(batch, geometry.indexed)
      : geometryDraw(geometry.draw, geometry.indexed);

    const prepared = await this.#webgpu.PreparePipeline(
      material.pipeline,
      material.prepareOptions ?? { warningsAsErrors: true }
    );
    const livePipeline = await this.#webgpu.CreateRenderPipeline(
      prepared,
      pipelineRecipe(material.recipe, topology)
    );
    const bindings = await this.#hooks.ResolveBindings(batch, livePipeline, preparedContext);
    if (!bindings || typeof bindings !== "object")
    {
      fail("ResolveBindings must return uniformData and resources");
    }

    let bindingSet = null;
    try
    {
      bindingSet = this.#webgpu.CreateBindingSet(livePipeline, {
        uniformData: bindings.uniformData,
        resources: bindings.resources
      });
      const draw = this.#webgpu.CreateDraw(livePipeline, {
        bindingSet,
        geometry: geometry.geometry,
        draw: drawArguments
      });
      const handle = Object.freeze({
        batch,
        context: preparedContext,
        prepared,
        livePipeline,
        bindingSet,
        draw
      });
      PREPARED_BATCHES.set(handle, {
        owner: this,
        destroyed: false
      });
      return handle;
    }
    catch (error)
    {
      bindingSet?.Destroy?.();
      throw error;
    }
  }

  /**
   * Encodes one prepared batch into the supplied render pass.
   *
   * `encodeState` is optional and, when given, elides the sets a previous batch
   * in the same run already performed. A caller encoding a single batch omits
   * it and every set happens.
   */
  Encode(pass, handle, encodeState = null)
  {
    const state = PREPARED_BATCHES.get(handle);
    if (!state || state.owner !== this) fail("prepared batch belongs to another dispatcher");
    if (state.destroyed) fail("prepared batch is destroyed");
    this.#webgpu.EncodeDraw(pass, handle.draw, encodeState);
  }

  /**
   * Encodes a batch vector run by run, hoisting each run's shared pipeline and
   * buffer bindings to its first batch, as Carbon's RenderBatchGroup hoists
   * them to the group.
   *
   * Order is preserved exactly. Runs are found among ADJACENT batches that
   * already agree; nothing is reordered, because sorting is Trinity's and a
   * reorder here would break golden-image comparison between backends.
   */
  #EncodeGrouped(pass, batches, encodeState)
  {
    for (const group of DeriveBatchGroups(batches, handle => handle?.draw))
    {
      for (let index = group.start; index < group.end; index += 1)
      {
        this.Encode(pass, batches[index], encodeState);
      }
    }
  }

  /** Releases the prepared batch's owned binding set. */
  Destroy(handle)
  {
    const state = PREPARED_BATCHES.get(handle);
    if (!state || state.owner !== this) fail("prepared batch belongs to another dispatcher");
    if (state.destroyed) return;
    state.destroyed = true;
    handle.bindingSet.Destroy();
  }

  /**
   * Snapshots and prepares both vectors of one finalized
   * TriRenderBatchAccumulator-compatible object. GDPR batches retain their
   * separate identity. Both vectors are grouped at encode time; preparation
   * stays per batch, because a binding set belongs to one batch.
   */
  async PrepareAccumulator(accumulator, context = undefined)
  {
    const preparedContext = preparationContext(context);
    if (!accumulator || typeof accumulator.GetGdprBatches !== "function"
      || typeof accumulator.GetBatches !== "function")
    {
      fail("accumulator requires GetGdprBatches and GetBatches");
    }
    const gdprBatches = accumulator.GetGdprBatches();
    const batches = accumulator.GetBatches();
    if (!Array.isArray(gdprBatches) || !Array.isArray(batches))
    {
      fail("accumulator batch getters must return arrays");
    }
    if (typeof accumulator.GetBatchCount === "function"
      && accumulator.GetBatchCount() !== gdprBatches.length + batches.length)
    {
      fail("accumulator batch count does not match its batch vectors");
    }

    const preparedGdprBatches = [];
    const preparedBatches = [];
    try
    {
      for (const batch of gdprBatches)
      {
        preparedGdprBatches.push(await this.Prepare(batch, preparedContext));
      }
      for (const batch of batches)
      {
        preparedBatches.push(await this.Prepare(batch, preparedContext));
      }
      const handle = Object.freeze({
        accumulator,
        context: preparedContext,
        gdprBatches: Object.freeze(preparedGdprBatches.slice()),
        batches: Object.freeze(preparedBatches.slice())
      });
      PREPARED_ACCUMULATORS.set(handle, {
        owner: this,
        destroyed: false
      });
      return handle;
    }
    catch (error)
    {
      for (let index = preparedBatches.length - 1; index >= 0; index -= 1)
      {
        this.Destroy(preparedBatches[index]);
      }
      for (let index = preparedGdprBatches.length - 1; index >= 0; index -= 1)
      {
        this.Destroy(preparedGdprBatches[index]);
      }
      throw error;
    }
  }

  /**
   * Encodes GDPR then ordinary prepared batches in accumulator order, grouping
   * each vector into hoisted runs.
   *
   * One encode state spans both vectors because they are encoded into one pass
   * and pass state does not reset at a vector boundary; a redundant set there
   * would be as wasteful as one inside a run.
   */
  EncodeAccumulator(pass, handle)
  {
    const state = PREPARED_ACCUMULATORS.get(handle);
    if (!state || state.owner !== this) fail("prepared accumulator belongs to another dispatcher");
    if (state.destroyed) fail("prepared accumulator is destroyed");
    const encodeState = new CjsWebgpuEncodeState();
    this.#EncodeGrouped(pass, handle.gdprBatches, encodeState);
    this.#EncodeGrouped(pass, handle.batches, encodeState);
  }

  /** Releases every binding set owned by a prepared accumulator. */
  DestroyAccumulator(handle)
  {
    const state = PREPARED_ACCUMULATORS.get(handle);
    if (!state || state.owner !== this) fail("prepared accumulator belongs to another dispatcher");
    if (state.destroyed) return;
    state.destroyed = true;
    for (let index = handle.batches.length - 1; index >= 0; index -= 1)
    {
      this.Destroy(handle.batches[index]);
    }
    for (let index = handle.gdprBatches.length - 1; index >= 0; index -= 1)
    {
      this.Destroy(handle.gdprBatches[index]);
    }
  }

  /**
   * Snapshots and prepares every accumulator in one
   * TriRenderBatchMap-compatible object without interpreting batch-type
   * meaning or selecting render passes.
   */
  async PrepareBatchMap(batchMap)
  {
    if (!batchMap || typeof batchMap.GetBatchTypes !== "function"
      || typeof batchMap.GetAccumulator !== "function")
    {
      fail("batch map requires GetBatchTypes and GetAccumulator");
    }
    const batchTypes = batchMap.GetBatchTypes();
    if (!Array.isArray(batchTypes)) fail("batch map GetBatchTypes must return an array");
    const seen = new Set();
    for (const batchType of batchTypes)
    {
      if (!Number.isInteger(batchType) || batchType < 0)
      {
        fail("batch map types must be non-negative integers");
      }
      if (seen.has(batchType)) fail(`batch map duplicates batch type ${batchType}`);
      seen.add(batchType);
    }

    const entries = [];
    try
    {
      for (const batchType of batchTypes)
      {
        const accumulator = batchMap.GetAccumulator(batchType);
        if (!accumulator) fail(`batch map has no accumulator for type ${batchType}`);
        entries.push(Object.freeze({
          batchType,
          accumulator: await this.PrepareAccumulator(accumulator, { batchType })
        }));
      }
      const preparedCount = entries.reduce(
        (count, entry) => count
          + entry.accumulator.gdprBatches.length
          + entry.accumulator.batches.length,
        0
      );
      if (typeof batchMap.GetBatchCount === "function"
        && batchMap.GetBatchCount() !== preparedCount)
      {
        fail("batch map count does not match its accumulators");
      }
      const handle = Object.freeze({
        batchMap,
        entries: Object.freeze(entries.slice())
      });
      PREPARED_BATCH_MAPS.set(handle, {
        owner: this,
        destroyed: false,
        entries: new Map(entries.map((entry) => [ entry.batchType, entry ]))
      });
      return handle;
    }
    catch (error)
    {
      for (let index = entries.length - 1; index >= 0; index -= 1)
      {
        this.DestroyAccumulator(entries[index].accumulator);
      }
      throw error;
    }
  }

  /**
   * Encodes one prepared batch type into a caller-selected compatible render
   * pass.
   */
  EncodeBatchType(pass, handle, batchType)
  {
    const state = PREPARED_BATCH_MAPS.get(handle);
    if (!state || state.owner !== this) fail("prepared batch map belongs to another dispatcher");
    if (state.destroyed) fail("prepared batch map is destroyed");
    const entry = state.entries.get(batchType);
    if (!entry) fail(`prepared batch map has no batch type ${batchType}`);
    this.EncodeAccumulator(pass, entry.accumulator);
  }

  /** Releases every accumulator and binding set owned by a prepared batch map. */
  DestroyBatchMap(handle)
  {
    const state = PREPARED_BATCH_MAPS.get(handle);
    if (!state || state.owner !== this) fail("prepared batch map belongs to another dispatcher");
    if (state.destroyed) return;
    state.destroyed = true;
    for (let index = handle.entries.length - 1; index >= 0; index -= 1)
    {
      this.DestroyAccumulator(handle.entries[index].accumulator);
    }
  }
}
