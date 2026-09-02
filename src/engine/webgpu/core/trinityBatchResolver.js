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
    // Under `signature`, not on the stage input itself: the reflection groups a
    // stage's declared inputs with the rest of its signature. Reading the wrong
    // level yields an empty list, a binding plan that matches nothing, and a
    // geometry with no attributes - found against real containers, where every
    // effect reported no inputs at all.
    const inputs = pass?.stageInputs?.[0]?.signature?.pipelineInputs ?? [];
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
    const pipeline = this.#PackageFor(material).GetPipeline(this.#techniqueName, passIndex);

    // BIND WHAT THE PIPELINE DECLARES. Inventing keys and hoping they match is
    // how this first failed against a real container: the device wanted
    // "uniform-buffer:0:0@fragment" and was handed "cb0". The binding record
    // carries its own identity, so there is nothing to guess.
    const uniformData = new Map();
    const resources = new Map();

    for (const group of pipeline?.bindGroups ?? [])
    {
      for (const binding of group.bindings ?? [])
      {
        const identity = binding.scopeIdentity
          ?? `${binding.resourceKind}:${binding.registerSpace}:${binding.registerIndex}`;

        if (binding.bindingKind === "constantBuffer" || binding.resourceKind === "uniform-buffer")
        {
          const value = await this.#ConstantsFor(binding, material, objectData, passIndex);

          if (value) uniformData.set(identity, value);

          continue;
        }

        if (!this.#resolveTexture)
        {
          fail(
            `pass binds ${binding.name ?? identity} and no ResolveTexture was supplied. `
            + "An effect with resources cannot be drawn without one, and binding "
            + "nothing would draw the wrong thing rather than fail."
          );
        }

        resources.set(identity, await this.#resolveTexture(binding.name, material));
      }
    }

    return { uniformData, resources };
  }

  /**
   * The bytes for one declared constant buffer.
   *
   * Which buffer it is comes from its register, using Carbon's slot map
   * (Tr2RenderContextEnum.h:406, Tr2Renderer.cpp:38-43): b0 is the effect's own
   * parameters, b3 and b4 are the per-object blocks. Per-frame b1 and b2 belong
   * to the scene and are bound by whoever owns the frame, not per batch.
   *
   * @param {object} binding Declared binding record.
   * @param {object} material Trinity material.
   * @param {object} objectData Per-object data for this batch.
   * @param {number} passIndex Pass within the technique.
   * @returns {Promise<ArrayBufferView|null>} Bytes, or null when nothing supplies it.
   */
  async #ConstantsFor(binding, material, objectData, passIndex)
  {
    const shader = material.GetShaderStateInterface?.();
    const pass = this.#PassOf(material, passIndex);

    if (binding.registerIndex === 0)
    {
      // b0, the effect's own constants. A pass with no pixel stage has none to
      // pack - a depth-only pass is the ordinary case - and that is an absence
      // rather than a failure.
      if (!pass?.stageInputs?.[1]?.exists) return null;

      const layout = MaterialLayoutFromShader(shader, {
        technique: this.#techniqueName,
        pass: passIndex
      });

      return layout?.size ? PackMaterialConstants(layout, material.GetValues?.() ?? {}) : null;
    }

    // b3 and b4, gated on the technique's stage mask the way Carbon gates
    // SetPerObjectDataToDevice.
    const techniqueIndex = shader?.GetTechniqueIndex?.(this.#techniqueName) ?? -1;
    const mask = techniqueIndex < 0 ? 0 : (shader.GetShaderTypeMask?.(techniqueIndex) ?? 0);
    const records = Tr2PerObjectData.getConstantRecords(objectData, mask);

    if (!records.length) return null;

    const collected = CollectPerObjectUploads(records.map((record, index) => ({
      identity: record.identity ?? `perObject${index}`,
      payload: record.payload
    })));

    return Object.values(collected.uniformData ?? {})[0] ?? null;
  }

  /** Releases every geometry this resolver realized. */
  Destroy()
  {
    for (const geometry of this.#geometry.values()) geometry.Destroy?.();

    this.#geometry.clear();
  }
}
