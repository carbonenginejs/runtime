// The concrete resolver: a Trinity batch to WebGPU pipeline, geometry and
// bindings.
//
// Carbon has no resolver class. This boundary stands in for what Carbon does
// between a sorted batch and a draw call, and the mapping is one to one:
//
//   ResolveMaterial  <- Tr2Shader::ApplyAllStateForPass    (Tr2Shader.cpp:157-166)
//                       program handle + render states for THIS pass
//   ResolveGeometry  <- SubmitGeometry                     (Tr2RenderContext.cpp:82-102)
//                       vertex declaration, streams, index buffer, draw
//   ResolveBindings  <- Tr2Material::ApplyMaterialDataForPass (Tr2Material.cpp:209-253)
//                       plus Tr2PerObjectData::SetPerObjectDataToDevice
//
// WHY A PACKAGE AND NOT THE INTERNED BYTECODE. Carbon hands a stage's bytecode
// to its abstraction layer, which builds the backend object
// (Tr2EffectDescription.cpp:586). Ours cannot stop there: a WGSL pipeline needs
// explicit bind-group layouts, which a stage blob does not carry and D3D never
// had to describe. The container's own reader produces them, so the engine
// reads the SAME BYTES the resource already holds - not a second fetch - and
// the package is that read.
//
// The recipe is the mode's standard states with the pass's overlaid, exactly as
// Carbon applies them (Tr2EffectStateManager.cpp:703-720). Reading the pass
// alone would produce a pipeline missing most of its state.
import { CjsTrinityBatchResolver } from "#trinity/core/batch/CjsTrinityBatchResolver";
import { Tr2EffectStateManager } from "#trinity/shader";
import { Tr2PerObjectData } from "#trinity/core/rawData/Tr2PerObjectData";
import { Tr2VertexDefinition } from "#trinity/core/vertex/Tr2VertexDefinition";
import { CarbonVertexElements } from "#trinity/core/vertex/vertexUsage";

import { CjsWebgpuPackage } from "../CjsWebgpuPackage.js";
import { WebgpuGeometryOptions } from "./geometryPlan.js";
import { MaterialLayoutFromShader, PackMaterialConstants } from "./materialConstants.js";
import { CollectPerObjectUploads } from "./perObjectUploader.js";


function fail(message)
{
  const error = new Error(`CjsWebgpuTrinityBatchResolver: ${message}`);
  error.code = "CJS_WEBGPU_RESOLVER_INVALID";
  throw error;
}


/** Resolves Trinity batches against one WebGPU device. */
export class CjsWebgpuTrinityBatchResolver extends CjsTrinityBatchResolver
{
  #webgpu;

  #createPackage;

  #techniqueName;

  #targets;

  #depthFormat;

  #resolveTexture;

  /** Effect resource to the package read from its own container bytes. */
  #packages = new WeakMap();

  /** Geometry source identity to realized device geometry. */
  #geometry = new Map();

  /**
   * @param {object} webgpu Canonical WebGPU device.
   * @param {object} options Composition.
   * @param {Function} [options.CreatePackage] Turns container bytes into a
   *   package. Injected rather than imported: the engine must not reach into a
   *   format's internals, and a caller that already holds a package can supply
   *   it without owning a reader.
   * @param {Function} [options.read] The WebGPU format's `read`, a convenience
   *   that supplies the default CreatePackage.
   * @param {Array<object>} options.targets Colour attachment formats of the
   *   pass this resolver draws into. A pipeline must declare them and the
   *   effect cannot know them; they belong to the frame.
   * @param {string|null} [options.depthFormat] Depth attachment format, or null
   *   when the pass has none.
   * @param {string} [options.techniqueName] Carbon's DEFAULT_TECHNIQUE.
   * @param {Function} [options.ResolveTexture] Supplies a device texture for a
   *   named effect resource. Absent means this resolver draws only effects that
   *   bind none, and says so rather than binding nothing.
   */
  constructor(webgpu, options = {})
  {
    super();

    if (!webgpu) fail("a WebGPU device is required");
    const createPackage = options.CreatePackage
      ?? (typeof options.read === "function"
        ? bytes => CjsWebgpuPackage.fromBytes(bytes, { read: options.read })
        : null);

    if (typeof createPackage !== "function")
    {
      fail("options.CreatePackage or options.read is required to build a package");
    }
    if (!Array.isArray(options.targets) || !options.targets.length)
    {
      fail("options.targets must name the pass's colour attachment formats");
    }

    this.#webgpu = webgpu;
    this.#createPackage = createPackage;
    this.#targets = options.targets;
    this.#depthFormat = options.depthFormat === undefined ? "depth24plus" : options.depthFormat;
    this.#techniqueName = options.techniqueName ?? "Main";
    this.#resolveTexture = options.ResolveTexture ?? null;
  }

  /**
   * The reflected pass this batch draws, for a pass index.
   *
   * @param {object} material Trinity material.
   * @param {number} passIndex Pass within the technique.
   * @returns {object|null} Reflected pass.
   */
  #PassOf(material, passIndex)
  {
    const shader = material.GetShaderStateInterface?.();
    const techniqueIndex = shader?.GetTechniqueIndex?.(this.#techniqueName) ?? -1;

    if (techniqueIndex < 0) return null;

    return shader.GetEffect?.()?.techniques?.[techniqueIndex]?.passes?.[passIndex] ?? null;
  }

  /**
   * The package for this material's effect, read once from the container bytes
   * the resource already holds.
   *
   * @param {object} material Trinity material.
   * @returns {object} Package.
   */
  #PackageFor(material)
  {
    const resource = material.GetEffectRes?.();

    if (!resource) fail("material has no effect resource to read a package from");

    const cached = this.#packages.get(resource);

    if (cached) return cached;

    const bytes = resource.GetContainerBytes?.();

    if (!bytes) fail("effect resource is not holding container bytes to read");

    const built = this.#createPackage(bytes);

    this.#packages.set(resource, built);

    return built;
  }

  /**
   * Realizes a batch's geometry once and keeps it.
   *
   * Keyed on the geometry resource, mesh, LOD and the shader inputs it was
   * bound against, because the same bytes drawn by two shaders need two
   * layouts. Realizing per batch would repack every mesh every frame.
   *
   * @param {object} source Batch geometry source.
   * @param {object} pass Reflected pass supplying the vertex inputs.
   * @returns {Promise<object>} Device geometry.
   */
  async #GeometryFor(source, pass)
  {
    const inputs = pass?.stageInputs?.[0]?.pipelineInputs ?? [];
    const geometry = source?.geometry;

    if (!geometry) fail("batch geometry source carries no geometry resource");

    const meshIndex = source.meshIndex ?? 0;
    const key = `${geometry.GetPath?.() ?? geometry.id ?? "geometry"}|${meshIndex}|`
      + inputs.map(input => `${input.usage}:${input.usageIndex}:${input.registerIndex}`).join(",");

    const cached = this.#geometry.get(key);

    if (cached) return cached;

    const mesh = geometry.GetPayload?.()?.meshes?.[meshIndex] ?? null;

    if (!mesh) fail(`geometry has no mesh ${meshIndex} to realize`);

    const elements = CarbonVertexElements(geometry.GetMeshVertexElements?.(meshIndex));
    const plan = Tr2VertexDefinition.resolveBindingPlan(elements, inputs);
    const request = WebgpuGeometryOptions(mesh, plan.entries, {
      label: `${geometry.GetPath?.() ?? "geometry"}#${meshIndex}`
    });

    const realized = await this.#webgpu.CreateGeometry(request);

    this.#geometry.set(key, realized);

    return realized;
  }

  /** @inheritdoc */
  async ResolveMaterial(material, batch, context)
  {
    const passIndex = context?.passIndex ?? 0;
    const pass = this.#PassOf(material, passIndex);

    if (!pass) fail(`material declares no pass ${passIndex} of technique ${this.#techniqueName}`);

    const setup = Tr2EffectStateManager.resolveRenderStates(batch.renderingMode, pass.renderStates);

    if (!setup) fail("pass resolves to no render state");

    const projected = setup.GetWebgpuRecipe({ depthFormat: this.#depthFormat });

    // The geometry decides the vertex layout, and CreateDraw requires the
    // pipeline's layout to equal the geometry's exactly, so it is realized here
    // rather than left to ResolveGeometry - which reuses the same cache entry.
    const geometry = await this.#GeometryFor(batch.geometrySource, pass);

    return {
      pipeline: this.#PackageFor(material).GetPipeline(this.#techniqueName, passIndex),
      recipe: {
        ...projected,
        vertex: { buffers: geometry.vertexBufferLayouts },
        fragment: { targets: this.#targets.map(target => ({ ...target, blend: projected.blend ?? undefined })) }
      }
    };
  }

  /** @inheritdoc */
  async ResolveGeometry(source, batch, context)
  {
    const pass = this.#PassOf(batch.material, context?.passIndex ?? 0);
    const geometry = await this.#GeometryFor(source, pass);

    // The draw arguments are omitted deliberately: Tr2MeshBase already resolved
    // them onto the batch from the LOD's areas, and the dispatcher reads them
    // there. Supplying them again would be a second derivation of the same
    // range, and the two could disagree.
    return { geometry, indexed: geometry.indexed };
  }

  /** @inheritdoc */
  async ResolveBindings(batch, objectData, context)
  {
    const passIndex = context?.passIndex ?? 0;
    const material = batch.material;
    const shader = material.GetShaderStateInterface?.();
    const uniformData = new Map();

    // b0, the effect's own constants, per Carbon's
    // CONSTANT_BUFFER_FOR_EFFECT_PARAMETERS. A pass with no pixel stage has
    // none to pack - a depth-only pass is the ordinary case - and that is an
    // absence rather than a failure.
    const pass = this.#PassOf(material, passIndex);
    const layout = pass?.stageInputs?.[1]?.exists
      ? MaterialLayoutFromShader(shader, { technique: this.#techniqueName, pass: passIndex })
      : null;

    if (layout?.size)
    {
      uniformData.set("cb0", PackMaterialConstants(layout, material.GetValues?.() ?? {}));
    }

    // b3 and b4, the per-object blocks, gated on the technique's stage mask the
    // way Carbon gates SetPerObjectDataToDevice.
    const techniqueIndex = shader?.GetTechniqueIndex?.(this.#techniqueName) ?? -1;
    const mask = techniqueIndex < 0 ? 0 : (shader.GetShaderTypeMask?.(techniqueIndex) ?? 0);
    const records = Tr2PerObjectData.getConstantRecords(objectData, mask);

    if (records.length)
    {
      const collected = CollectPerObjectUploads(records.map((record, index) => ({
        identity: record.identity ?? `perObject${index}`,
        payload: record.payload
      })));

      for (const [ identity, value ] of Object.entries(collected.uniformData ?? {}))
      {
        uniformData.set(identity, value);
      }
    }

    return { uniformData, resources: this.#ResolveResources(material, passIndex) };
  }

  /**
   * The pass's texture and sampler bindings.
   *
   * Carbon rebuilds a resource set only when its description changed and reuses
   * it otherwise (Tr2Material.cpp:239-250); the dispatcher creates one binding
   * set per prepared batch, so the reuse that matters is the TEXTURE's, which
   * belongs to whatever supplies it.
   *
   * @param {object} material Trinity material.
   * @param {number} passIndex Pass within the technique.
   * @returns {Map} Resource bindings by identity.
   */
  #ResolveResources(material, passIndex)
  {
    const pass = this.#PassOf(material, passIndex);
    const resources = new Map();

    for (const stage of pass?.stageInputs ?? [])
    {
      for (const [ registerIndex, resource ] of stage?.resources ?? [])
      {
        const name = resource?.name;

        if (!name) continue;

        if (!this.#resolveTexture)
        {
          fail(
            `pass binds texture "${name}" and no ResolveTexture was supplied. `
            + "An effect with resources cannot be drawn without one, and binding "
            + "nothing would draw the wrong thing rather than fail."
          );
        }

        resources.set(`t${registerIndex}`, this.#resolveTexture(name, material));
      }
    }

    return resources;
  }

  /** Releases every geometry this resolver realized. */
  Destroy()
  {
    for (const geometry of this.#geometry.values()) geometry.Destroy?.();

    this.#geometry.clear();
  }
}
