import { Topology } from "#consts/render-context";
import { CjsWebgpuDevice } from "../CjsWebgpuDevice.js";
import { CjsTrinityBatchDispatcher } from "#trinity/core/batch/CjsTrinityBatchDispatcher";
import { CjsTrinityBatchResolver } from "#trinity/core/batch/CjsTrinityBatchResolver";
import { ITriRenderBatchAccumulator } from "#trinity/core/batch/ITriRenderBatchAccumulator";
import { Tr2RenderBatch } from "#trinity/core/batch/Tr2RenderBatch";
import { TriRenderBatchMap } from "#trinity/core/batch/TriRenderBatchMap";
import { CjsWebgpuEncodeState, DeriveBatchGroups } from "./batchGroups.js";

const MAX_GPU_SIZE_32 = 0xffffffff;

// Keyed by `Topology`, the abstraction layer's vocabulary, which is what a
// batch carries as of 2026-09-05. It was keyed by `D3dPrimitiveTopology`
// before, and the two numberings COLLIDE - D3D's 4 is TRIANGLELIST, the AL's 4
// is TOP_LINES - so this table and Tr2RenderBatch have to move together.
//
// TOP_TRIANGLE_FAN is absent because WebGPU has no fan primitive. Carbon's own
// header already says the value is invalid on DX11.
const TOPOLOGIES = Object.freeze({
  [Topology.TOP_TRIANGLES]: "triangle-list",
  [Topology.TOP_TRIANGLE_STRIP]: "triangle-strip",
  [Topology.TOP_LINES]: "line-list",
  [Topology.TOP_LINE_STRIP]: "line-strip",
  [Topology.TOP_POINTS]: "point-list"
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
  return context;
}

/** Carbon's DEFAULT_TECHNIQUE (Tr2RenderContext.h:37). */
const DEFAULT_TECHNIQUE = "Main";

/**
 * How many passes this batch's material draws, the way Carbon asks
 * (Tr2RenderContext.cpp:463-471): the material's shader state interface for the
 * technique index, then its pass count, returning zero for either miss so the
 * batch emits nothing.
 *
 * A material that cannot answer draws ONE pass. Carbon has no such material -
 * it always holds a Tr2Material - but a caller that resolves its own pipeline
 * without Trinity reflection means exactly one thing to draw, and refusing it
 * would reject the composition boundary's whole point.
 */
function passCountOf(material, techniqueName)
{
  // EXPLICIT PROBES, not hedges, and the line below already asked this way.
  // The boundary deliberately accepts a caller's own material - see the
  // paragraph above - so "does this object answer" is the real question here.
  const shader = typeof material.GetShaderStateInterface === "function"
    ? material.GetShaderStateInterface()
    : null;

  if (!shader || typeof shader.GetTechniqueIndex !== "function") return 1;

  const techniqueIndex = shader.GetTechniqueIndex(techniqueName);

  if (!Number.isInteger(techniqueIndex) || techniqueIndex < 0) return 0;

  return typeof shader.GetPassCount === "function" ? shader.GetPassCount(techniqueIndex) : 0;
}

function geometryDraw(value, indexed)
{
  if (!value || typeof value !== "object" || Array.isArray(value))
  {
    fail("ResolveGeometry draw must be an object");
  }
  if (indexed)
  {
    return {
      indexCount: gpuSize32(value.indexCount, "indexCount", "resolved geometry draw"),
      instanceCount: gpuSize32(value.instanceCount, "instanceCount", "resolved geometry draw"),
      firstIndex: gpuSize32(value.firstIndex, "firstIndex", "resolved geometry draw"),
      baseVertex: signedOffset32(value.baseVertex, "baseVertex"),
      firstInstance: gpuSize32(value.firstInstance, "firstInstance", "resolved geometry draw")
    };
  }
  return {
    vertexCount: gpuSize32(value.vertexCount, "vertexCount", "resolved geometry draw"),
    instanceCount: gpuSize32(value.instanceCount, "instanceCount", "resolved geometry draw"),
    firstVertex: gpuSize32(value.firstVertex, "firstVertex", "resolved geometry draw"),
    firstInstance: gpuSize32(value.firstInstance, "firstInstance", "resolved geometry draw")
  };
}

function batchDraw(batch, indexed)
{
  const count = gpuSize32(batch.indexCountPerInstance, "indexCountPerInstance");
  const instanceCount = gpuSize32(batch.instanceCount, "instanceCount");
  const first = gpuSize32(batch.startIndexLocation, "startIndexLocation");
  const firstInstance = gpuSize32(batch.startInstanceLocation, "startInstanceLocation");
  if (indexed)
  {
    return {
      indexCount: count,
      instanceCount,
      firstIndex: first,
      baseVertex: signedBaseVertex(batch.baseVertexLocation),
      firstInstance
    };
  }
  return {
    vertexCount: count,
    instanceCount,
    firstVertex: first,
    firstInstance
  };
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
 * Engine-side adapter for canonical Trinity render batches.
 *
 * Trinity supplies transient CPU references and draw arguments. A nominal
 * composition resolver maps those references to WebGPU-owned material,
 * geometry, and binding objects.
 */
export class CjsWebgpuTrinityBatchDispatcher extends CjsTrinityBatchDispatcher
{
  #webgpu;

  #resolver;

  /**
   * @param {CjsWebgpuDevice} webgpu Canonical WebGPU device.
   * @param {CjsTrinityBatchResolver} resolver Backend composition resolver.
   * @param {Function} resolver.ResolveMaterial Resolves batch material to
   *   { pipeline, recipe, prepareOptions? }; receives immutable preparation
   *   context as its third argument.
   * @param {Function} resolver.ResolveGeometry Resolves geometrySource to
   *   { geometry, indexed, draw? }; a draw override supplies arguments derived
   *   from deferred geometry areas and realized buffer packing. Receives
   *   preparation context as its third argument.
   * @param {Function} resolver.ResolveBindings Resolves batch/object data to
   *   { uniformData, resources }; receives preparation context as its third
   *   argument.
   */
  constructor(webgpu, resolver)
  {
    super();
    if (!(webgpu instanceof CjsWebgpuDevice))
    {
      fail("webgpu boundary requires a CjsWebgpuDevice");
    }
    if (!(resolver instanceof CjsTrinityBatchResolver))
    {
      fail("composition resolver requires a CjsTrinityBatchResolver");
    }
    this.#webgpu = webgpu;
    this.#resolver = resolver;
  }

  /**
   * Resolves and validates one transient Trinity batch into a generation-bound
   * WebGPU draw. External geometry and resources remain owned by their
   * resolvers; the returned handle owns only its binding set.
   */
  async Prepare(batch, context = undefined)
  {
    const preparedContext = preparationContext(context);
    if (!(batch instanceof Tr2RenderBatch)) fail("batch must be a Tr2RenderBatch");
    if (batch.material === null || batch.material === undefined) fail("batch material is required");
    if (batch.geometrySource === null || batch.geometrySource === undefined)
    {
      fail("batch geometrySource is required");
    }
    const topology = TOPOLOGIES[batch.topology];
    if (!topology) fail(`batch topology ${batch.topology} is unsupported`);

    // Carbon bails before touching the device when the technique is absent or
    // draws nothing (Tr2RenderContext.cpp:465-471), and so does this.
    const passCount = passCountOf(batch.material, preparedContext.techniqueName ?? DEFAULT_TECHNIQUE);

    if (!passCount) return null;

    const material = await this.#resolver.ResolveMaterial(
      batch.material,
      batch,
      { ...preparedContext, passIndex: 0 }
    );
    if (!material || typeof material !== "object" || material.pipeline == null)
    {
      fail("ResolveMaterial must return a pipeline and recipe");
    }
    const geometry = await this.#resolver.ResolveGeometry(
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

    // Carbon resolves the shader program and render states per PASS and the
    // material data per pass as well (Tr2RenderContext.cpp:472-535), so a
    // multi-pass technique yields one pipeline and one binding set per pass over
    // the same geometry and the same draw arguments.
    const passes = [];

    try
    {
      for (let passIndex = 0; passIndex < passCount; passIndex += 1)
      {
        const passContext = { ...preparedContext, passIndex };

        const perPass = passIndex === 0
          ? material
          : await this.#resolver.ResolveMaterial(batch.material, batch, passContext);

        if (!perPass || typeof perPass !== "object" || perPass.pipeline == null)
        {
          fail(`ResolveMaterial must return a pipeline and recipe for pass ${passIndex}`);
        }

        const prepared = await this.#webgpu.PreparePipeline(
          perPass.pipeline,
          perPass.prepareOptions ?? { warningsAsErrors: true }
        );
        const livePipeline = await this.#webgpu.CreateRenderPipeline(
          prepared,
          pipelineRecipe(perPass.recipe, topology)
        );
        const bindings = await this.#resolver.ResolveBindings(batch, batch.objectData, passContext);

        if (!bindings || typeof bindings !== "object")
        {
          fail("ResolveBindings must return uniformData and resources");
        }

        // Recorded BEFORE the draw is made, so a rejected draw still leaves its
        // binding set owned and destroyable by the rollback below.
        const entry = {
          passIndex,
          prepared,
          livePipeline,
          bindingSet: this.#webgpu.CreateBindingSet(livePipeline, {
            uniformData: bindings.uniformData,
            resources: bindings.resources
          }),
          draw: null
        };

        passes.push(entry);

        entry.draw = this.#webgpu.CreateDraw(livePipeline, {
          bindingSet: entry.bindingSet,
          geometry: geometry.geometry,
          draw: drawArguments
        });
      }
    }
    catch (error)
    {
      for (const entry of passes) entry.bindingSet.Destroy();
      throw error;
    }

    const handle = {
      batch,
      context: preparedContext,
      passes,
      // The first pass's members stay on the handle: grouping compares draws,
      // and a single-pass batch - which is nearly all of them - reads exactly
      // as it did before passes existed.
      prepared: passes[0].prepared,
      livePipeline: passes[0].livePipeline,
      bindingSet: passes[0].bindingSet,
      draw: passes[0].draw
    };

    PREPARED_BATCHES.set(handle, { owner: this, destroyed: false });

    return handle;
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
    for (const entry of handle.passes) this.#webgpu.EncodeDraw(pass, entry.draw, encodeState);
  }

  /** Encodes one pass of a prepared batch, for the grouped pass-major walk. */
  #EncodePass(pass, handle, passIndex, encodeState)
  {
    const entry = handle.passes[passIndex];

    if (entry) this.#webgpu.EncodeDraw(pass, entry.draw, encodeState);
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
      // PASS-MAJOR, as Carbon's RenderBatchGroup is: every batch of the group
      // draws pass 0, then every batch draws pass 1
      // (Tr2RenderContext.cpp:472-535). Encoding batch-major instead would
      // interleave a two-pass effect's passes between objects and change what
      // lands on screen.
      let passCount = 0;
      for (let index = group.start; index < group.end; index += 1)
      {
        passCount = Math.max(passCount, batches[index]?.passes?.length ?? 0);
      }

      for (let passIndex = 0; passIndex < passCount; passIndex += 1)
      {
        for (let index = group.start; index < group.end; index += 1)
        {
          this.#EncodePass(pass, batches[index], passIndex, encodeState);
        }
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
    for (const entry of handle.passes) entry.bindingSet.Destroy();
  }

  /**
   * Snapshots and prepares both vectors of one finalized
   * canonical Trinity batch accumulator. GDPR batches retain their
   * separate identity. Both vectors are grouped at encode time; preparation
   * stays per batch, because a binding set belongs to one batch.
   */
  async PrepareAccumulator(accumulator, context = undefined)
  {
    const preparedContext = preparationContext(context);
    if (!(accumulator instanceof ITriRenderBatchAccumulator))
    {
      fail("accumulator must be an ITriRenderBatchAccumulator");
    }
    const gdprBatches = accumulator.GetGdprBatches();
    const batches = accumulator.GetBatches();
    if (!Array.isArray(gdprBatches) || !Array.isArray(batches))
    {
      fail("accumulator batch getters must return arrays");
    }
    if (accumulator.GetBatchCount() !== gdprBatches.length + batches.length)
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
      const handle = {
        accumulator,
        context: preparedContext,
        gdprBatches: preparedGdprBatches.slice(),
        batches: preparedBatches.slice()
      };
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
   * canonical TriRenderBatchMap without interpreting batch-type
   * meaning or selecting render passes.
   */
  async PrepareBatchMap(batchMap)
  {
    if (!(batchMap instanceof TriRenderBatchMap))
    {
      fail("batch map must be a TriRenderBatchMap");
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
        entries.push({
          batchType,
          accumulator: await this.PrepareAccumulator(accumulator, { batchType })
        });
      }
      const preparedCount = entries.reduce(
        (count, entry) => count
          + entry.accumulator.gdprBatches.length
          + entry.accumulator.batches.length,
        0
      );
      if (batchMap.GetBatchCount() !== preparedCount)
      {
        fail("batch map count does not match its accumulators");
      }
      const handle = {
        batchMap,
        entries: entries.slice()
      };
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
