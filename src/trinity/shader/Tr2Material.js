// Source: trinity/trinity/Shader/Tr2Material.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type } from "#schema";
import { CjsModel } from "#model";
import { Tr2Shader } from "#resource/shader";
import { ShaderType } from "#consts/render-context";
import { FNV1_INITIAL, hashFnv1Floats } from "../../global/utils/hash.js";
import { Failed } from "../../trinityal/ALResult.js";
import { Tr2ConstantUsageAL } from "../../trinityal/index.js";
import { Tr2EffectStateManager } from "./Tr2EffectStateManager.js";
import { EFFECT_CONSTANTS } from "../core/Tr2Renderer.js";
import { CompareFunc } from "#consts/render-context";
import { SAMPLER_LOD_UNBOUNDED } from "../../trinityal/Tr2SamplerDescription.js";


/**
 * Carbon's `CreateSamplerDescription( const Tr2SamplerOverride& )`
 * (`Tr2Effect.cpp:595-612`), field for field: the override's one filter serves
 * min and mag, no comparison, a transparent black border, `maxMipLevel` as the
 * minimum LOD and an unbounded maximum.
 *
 * @param {object} override A `Tr2SamplerOverride`.
 * @returns {object} A `Tr2SamplerDescription`.
 */
function SamplerDescriptionFromOverride(override)
{
  return {
    minFilter: override.filter,
    magFilter: override.filter,
    mipFilter: override.mipFilter,
    comparison: false,
    addressU: override.addressU,
    addressV: override.addressV,
    addressW: override.addressW,
    mipLODBias: override.lodBias,
    maxAnisotropy: override.maxAnisotropy,
    comparisonFunc: CompareFunc.CMP_NEVER,
    borderColor: [ 0, 0, 0, 0 ],
    minLOD: override.maxMipLevel,
    maxLOD: SAMPLER_LOD_UNBOUNDED
  };
}

/** Owns a resolved shader's per-technique pass and library bindings, resource invalidation, texture LOD forwarding, and draw-sort state. */
@type.define({ className: "Tr2Material", family: "shader" })
export class Tr2Material extends CjsModel
{

  /** m_shader (Tr2ShaderPtr) */
  @type.objectRef("Tr2Shader")
  shader = null;

  /** m_parametersForPasses (Tr2EffectTechniqueParametersVector) */
  @type.list("Tr2EffectTechniqueInputs")
  parametersForPasses = [];

  /** m_parametersForLibraries (Tr2EffectTechniqueParametersVector) */
  @type.list("Tr2EffectTechniqueInputs")
  parametersForLibraries = [];

  /** m_lodTextureParameters (std::vector<ITriEffectTextureParameterPtr>) */
  @type.list("ITriEffectTextureParameter")
  lodTextureParameters = [];

  /** m_resourceSetHash (mutable uint32_t) */
  @type.uint32
  resourceSetHash = 0;

  /** m_compatibleWithGdr (bool) */
  @type.boolean
  compatibleWithGdr = false;

  /**
   * The resource-set hash, which doubles as the material's draw-sort key; 0
   * whenever the resource sets have been invalidated.
   */
  GetSortValue()
  {
    return this.resourceSetHash;
  }

  /**
   * The Tr2Shader supplying reflection and render state for this material, or
   * null before one is resolved.
   */
  GetShaderStateInterface()
  {
    return this.shader;
  }

  /**
   * The per-pass parameter block for a technique/pass pair, or null when either
   * index is out of range.
   */
  GetPassDescription(techniqueIndex = 0, passIndex = 0)
  {
    return this.parametersForPasses?.[techniqueIndex]?.passes?.[passIndex] ?? null;
  }

  /**
   * Binds one pass's parameters: its constants to the stages that read them,
   * and its resources through a resource set built from the description.
   *
   * Carbon `Tr2Material::ApplyMaterialDataForPass`
   * (`Shader/Tr2Material.cpp:209-253`). THIS IS THE METHOD THE INTENT QUEUE
   * WAS BUILT AROUND NOT HAVING - the browser backend's resolver reimplemented
   * its effect on the engine side because "the engine does device work" was
   * read as the engine PACKAGE rather than the abstraction layer. It belongs
   * here, and everything it touches is a description or a handle.
   *
   * ONLY THE STAGES THE TECHNIQUE DECLARES are walked, which is what the mask
   * is for: a technique with no geometry shader must not bind one's constants.
   *
   * @param {number} techniqueIndex Technique index.
   * @param {number} passIndex Pass index within the technique.
   * @param {object} renderContext The context to bind against.
   * @returns {boolean} Whether the pass was applied.
   */
  ApplyMaterialDataForPass(techniqueIndex, passIndex, renderContext)
  {
    if (!this.shader) return false;

    const pass = this.GetPassDescription(techniqueIndex, passIndex);

    if (!pass) return false;

    // SEEDED ON FIRST APPLY, THROUGH THE CONTEXT THAT APPLIES. Carbon seeds the
    // pass description with sampler states at effect load through the
    // main-thread context (Tr2EffectDescription.cpp:436, :639-650) and applies
    // overrides per rebuild (Tr2Effect.cpp:623-662). Ours has no process-wide
    // device context - `Tr2RenderContext.GetDefault()` exists, but nothing
    // installs a backend on it - so seeding there made every sampler state the
    // stub's, which a WebGPU resource set cannot bind and replaced with its
    // dummy. A fresh pass (no set yet) is seeded here, by the context that will
    // build its resource set, of that backend's kind.
    if (pass.resourceSet === null) this.SeedSamplers(techniqueIndex, passIndex, pass, renderContext);

    let mask = this.shader.GetShaderTypeMask(techniqueIndex);
    let descChanged = pass.resourceSetDirty;

    for (let stage = 0; stage < ShaderType.SHADER_TYPE_COUNT && mask; stage += 1)
    {
      if (!(mask & (1 << stage))) continue;

      // OR-ASSIGNED, NEVER SHORT-CIRCUITED. Carbon writes `descChanged |=`, and
      // `||` here would skip the remaining stages' bindings as soon as one
      // reported a change - a pixel stage silently unbound because the vertex
      // stage happened to move first.
      descChanged = this.ApplyShaderInputs(pass, stage, renderContext) || descChanged;
      mask &= ~(1 << stage);
    }

    if (descChanged || !pass.resourceSet)
    {
      const handle = this.shader.GetEffect()?.techniques?.[techniqueIndex]?.passes?.[passIndex]?.shaderProgram;

      // Carbon: `renderContext.m_esm.GetShaderProgram( handle )`, then
      // `pp.m_resourceSet.Create( desc, *sp, renderContext )`
      // (Tr2Material.cpp:232-234). The program is the REALIZED AL program -
      // the resource set lays its entries out against the program's bindings -
      // and the set is the backend's kind, made by the context. Until
      // 2026-09-10 this constructed the stub directly with the interned ROW,
      // so no backend ever saw a resource set it could bind.
      if (Tr2EffectStateManager.getShaderProgramRecord(handle) === null) return false;

      const program = renderContext.GetEffectStateManager().GetShaderProgram(handle);

      // Carbon tests the program itself and binds nothing without one
      // (Tr2Material.cpp:232-236); a stage that refused to compile is such a case.
      if (!program) return false;

      const resourceSet = renderContext.CreateResourceSet(pass.resourceSetDesc, program);

      if (!resourceSet) return false;

      pass.resourceSet = resourceSet;
      pass.resourceSetHash = pass.resourceSetDesc.ComputeHash();
      pass.resourceSetDirty = false;

      this.#RebuildResourceSetHash();
    }

    return renderContext.SetResourceSet(pass.resourceSet);
  }

  /**
   * Applies one shader stage of one pass: its constants, then its resources
   * into the pass's description.
   *
   * Carbon `Tr2Material::ApplyShaderInputs`.
   *
   * @param {object} pass A `Tr2EffectPassParameters`.
   * @param {number} shaderType A `ShaderType`.
   * @param {object} renderContext The context to bind against.
   * @returns {boolean} Whether the description changed.
   */
  ApplyShaderInputs(pass, shaderType, renderContext)
  {
    const input = pass.stageInput[shaderType];

    if (!input) return false;

    this.ApplyConstants(shaderType, input, pass.reroutedParameters.length > 0, renderContext);

    return this.UpdateResourceSetDesc(shaderType, input, pass.resourceSetDesc, renderContext);
  }

  /**
   * Writes one stage's textures and UAVs into a resource-set description.
   *
   * Carbon `Tr2Material::UpdateResourceSetDesc`. Each parameter binds itself -
   * the material knows the register, the parameter knows the resource.
   *
   * `registerCount` IS A FLAG WORD HERE, not a count. Carbon passes it as
   * `ResourceFlags`, and for a resource that field carries the sRGB bit; only
   * for a constant is it a byte size.
   *
   * @param {number} shaderType A `ShaderType`.
   * @param {object} input A `Tr2MaterialStageInput`.
   * @param {object} desc A `Tr2ResourceSetDescriptionAL`.
   * @returns {boolean} Whether any binding changed the description.
   */
  UpdateResourceSetDesc(shaderType, input, desc, renderContext = null)
  {
    let descChanged = false;

    for (const texture of input.textures)
    {
      // The context is an added trailing argument: a texture parameter makes
      // the resource's texture at first bind through it (Carbon makes it at
      // load through a process-wide context; see Tr2ImageIOHelpers).
      descChanged = texture.sourceValue?.CopyToResourceSet(
        desc,
        shaderType,
        texture.registerIndex,
        texture.registerCount,
        renderContext
      ) || descChanged;
    }

    for (const uav of input.uavs)
    {
      descChanged = uav.sourceValue?.ApplyUav(desc, shaderType, uav.registerIndex) || descChanged;
    }

    return descChanged;
  }

  /**
   * Refreshes one stage's constant mirror and binds its buffer.
   *
   * Carbon `Tr2Material::ApplyConstants`. A stage with no constant buffer does
   * nothing at all - not an empty bind.
   *
   * @param {number} shaderType A `ShaderType`.
   * @param {object} input A `Tr2MaterialStageInput`.
   * @param {boolean} hasReroutables Whether the pass has rerouted parameters.
   * @param {object} renderContext The context to bind against.
   * @returns {boolean} Whether a buffer was bound.
   */
  ApplyConstants(shaderType, input, hasReroutables, renderContext)
  {
    const mirror = input.constantMirror;

    // Carbon's test is `cb.GetSize()` (`Tr2Material.cpp:309`): a stage with no
    // constants binds nothing.
    if (!mirror) return false;

    // CREATED ON FIRST APPLY, NOT AT ALLOCATION. Carbon's
    // `AllocateConstants` creates the buffer through a process-wide
    // main-thread context (`USE_MAIN_THREAD_RENDER_CONTEXT`, `:170-176`);
    // ours has no global context, so the buffer is made by the context that
    // first applies it, of that backend's kind. The mirror's bytes seed it so
    // a fully static stage - Carbon's shared immutable buffer - is correct
    // without ever being locked. Until 2026-09-10 nothing created this buffer
    // at all, so b0 never reached any backend from this path.
    if (!input.constantBuffer)
    {
      input.constantBuffer = renderContext.CreateConstantBuffer(mirror.byteLength, Tr2ConstantUsageAL.ONE_SHOT, mirror);

      if (!input.constantBuffer) return false;
    }

    this.UpdateConstants(shaderType, input, hasReroutables, renderContext);

    return renderContext.SetConstants(input.constantBuffer, shaderType, EFFECT_CONSTANTS);
  }

  /**
   * Refills one stage's CPU constant mirror from its parameters.
   *
   * Carbon `Tr2Material::UpdateConstants`. The three-way condition is Carbon's:
   * a dirty buffer must be refilled, a rerouted parameter may have been
   * written behind the material's back, and a stage with live parameters is
   * refilled every time because a parameter's value can change without
   * anything marking the buffer.
   *
   * @param {number} shaderType A `ShaderType`.
   * @param {object} input A `Tr2MaterialStageInput`.
   * @param {boolean} hasReroutables Whether the pass has rerouted parameters.
   * @param {object} renderContext The context to copy against.
   * @returns {boolean} Whether the mirror was refilled.
   */
  UpdateConstants(shaderType, input, hasReroutables, renderContext)
  {
    if (!input.constantBuffer) return false;
    if (!input.constantBufferDirty && !hasReroutables && !input.shaderParameters.length) return false;

    const mirror = input.constantMirror;

    if (!mirror) return false;

    for (const parameter of [ ...input.shaderParameters, ...input.shaderParametersWithNotification ])
    {
      // The register index is a BYTE OFFSET into the mirror, and the count a
      // byte size. Carbon indexes the raw pointer with both.
      parameter.sourceValue?.CopyValueToEffect(
        shaderType,
        mirror.subarray(parameter.registerIndex),
        parameter.registerCount,
        renderContext
      );
    }

    // Carbon (`cpp:341-346`): lock, copy the mirror, unlock. The upload itself
    // is the backend's business and happens when the buffer is bound.
    const { result, data } = input.constantBuffer.Lock(renderContext);

    if (!Failed(result) && data)
    {
      data.set(mirror.subarray(0, Math.min(mirror.length, data.length)));
      input.constantBuffer.Unlock(renderContext);
    }

    input.constantBufferDirty = false;

    return true;
  }

  /**
   * Folds every pass's resource-set hash into the material's own.
   *
   * Carbon does this inline at the end of `ApplyMaterialDataForPass`; it is a
   * method here because it is a whole-material walk hiding inside a per-pass
   * call, and naming it is the only way that reads as deliberate.
   */
  /**
   * Puts the pass's sampler states into its resource-set description, authored
   * first and overrides on top.
   *
   * Carbon does this in two places that both run at effect load: the
   * description reader creates each authored sampler's state and seeds the
   * pass description (`Tr2EffectDescription.cpp:436`, `:639-650`), and
   * `RebuildCachedDataInternal` creates a state per override and
   * `UpdateSamplers` writes it over the authored one by NAME
   * (`Tr2Effect.cpp:623-662`, `:688-691`), first match only
   * (`FindSamplerByName`, `:627`). A name is matched only on a DYNAMIC sampler:
   * Carbon nulls the name of a non-dynamic one at read (`Tr2EffectDescription.cpp:425-433`),
   * so an override can never reach it.
   *
   * Until 2026-09-10 neither happened: the description held no samplers at all,
   * so a resource set could never bind one. A description the factory refuses -
   * a mode Carbon's enum lacks - leaves the register unset rather than binding a
   * wrong sampler.
   *
   * @param {number} techniqueIndex The technique.
   * @param {number} passIndex The pass.
   * @param {object} pass The pass parameters owning the description.
   * @param {object} renderContext The context whose sampler factory answers.
   * @returns {void}
   */
  SeedSamplers(techniqueIndex, passIndex, pass, renderContext)
  {
    const reflected = this.shader.GetEffect()?.techniques?.[techniqueIndex]?.passes?.[passIndex];
    const description = pass.resourceSetDesc;
    const overrides = this.samplerOverrides ?? [];

    for (let stageType = 0; stageType < (reflected?.stageInputs?.length ?? 0); stageType += 1)
    {
      const stage = reflected.stageInputs[stageType];

      if (!stage?.exists) continue;

      for (const [ registerIndex, setup ] of stage.samplers ?? [])
      {
        const state = renderContext.CreateSamplerState(setup?.sampler);

        if (state) description.SetSampler(stageType, registerIndex, state);
      }

      for (const override of overrides)
      {
        for (const [ registerIndex, setup ] of stage.samplers ?? [])
        {
          if (!setup?.isDynamic || setup.name !== override.name) continue;

          const state = renderContext.CreateSamplerState(SamplerDescriptionFromOverride(override));

          // Carbon: an override that CHANGED the description makes the pass
          // incompatible with the GDR path (Tr2Effect.cpp:653-657).
          if (state && description.SetSampler(stageType, registerIndex, state)) pass.compatibleWithGdr = false;

          break;
        }
      }
    }
  }

  /** Rehashes every pass's resource-set hash into one, so a changed binding is seen. */
  #RebuildResourceSetHash()
  {
    let hash = FNV1_INITIAL;

    for (const technique of this.parametersForPasses)
    {
      for (const pass of technique?.passes ?? []) hash = hashFnv1Floats([ pass.resourceSetHash ], hash);
    }

    this.resourceSetHash = hash >>> 0;
  }

  /**
   * Marks every pass's resource set and used-texture list stale and clears the
   * material sort hash, so they are rebuilt before the next draw.
   */
  InvalidateResourceSets()
  {
    for (const technique of this.parametersForPasses)
    {
      for (const pass of technique?.passes ?? [])
      {
        // THESE TWO LINES WERE MISSING AND THE OMISSION WAS LIVE. Carbon drops
        // the realized set and clears the description
        // (`Shader/Tr2Material.cpp`, InvalidateResourceSets); without them
        // this marked the set dirty while leaving the stale bindings in place,
        // so a material whose textures changed could rebind the old ones. It is
        // also what separates this method from `ResourceChanged` below, which
        // deliberately only invalidates - the two were identical, which should
        // have been the tell.
        //
        // Clearing a DESCRIPTION is not touching a backend object. A test used
        // to assert the opposite - "runtime-trinity must not clear backend
        // resource sets" - which was the engine-means-`trinityal/webgpu`
        // misreading written down as a guarantee. Trinity owns the
        // description; the abstraction layer owns the set built from it.
        pass.resourceSet = null;
        pass.resourceSetDesc?.ClearResources();
        pass.resourceSetHash = 0;
        pass.resourceSetDirty = true;
        pass.usedTexturesDirty = true;
      }
      for (const library of technique?.libraries ?? [])
      {
        library.usedTexturesDirty = true;
      }
    }
    this.resourceSetHash = 0;
  }

  /**
   * Same invalidation as InvalidateResourceSets, raised when a bound resource
   * itself changed rather than the set layout.
   */
  ResourceChanged()
  {
    for (const technique of this.parametersForPasses)
    {
      for (const pass of technique?.passes ?? [])
      {
        pass.resourceSetHash = 0;
        pass.resourceSetDirty = true;
        pass.usedTexturesDirty = true;
      }
      for (const library of technique?.libraries ?? [])
      {
        library.usedTexturesDirty = true;
      }
    }
    this.resourceSetHash = 0;
  }

  /**
   * Flags the constant buffer of every stage that has notification-registered
   * parameters - pass stages plus each library's global and local input - and
   * clears the sort hash.
   */
  MarkConstantBuffersDirty()
  {
    for (const technique of this.parametersForPasses)
    {
      for (const pass of technique?.passes ?? [])
      {
        for (const stage of pass?.stageInput ?? [])
        {
          if (stage?.shaderParametersWithNotification?.length)
          {
            stage.constantBufferDirty = true;
          }
        }
      }
      for (const library of technique?.libraries ?? [])
      {
        if (library?.globalInput?.shaderParametersWithNotification?.length)
        {
          library.globalInput.constantBufferDirty = true;
        }
        if (library?.localInput?.shaderParametersWithNotification?.length)
        {
          library.localInput.constantBufferDirty = true;
        }
      }
    }
    this.resourceSetHash = 0;
  }

  /**
   * Forwards a screen-size/world-radius LOD query to every texture parameter
   * registered as LOD-driven during the last cached-data rebuild.
   */
  UsedWithScreenSize(screenSize, worldRadius, uvDensities = [])
  {
    for (const value of this.lodTextureParameters)
    {
      // Unhedged: the list is FILTERED ON ENTRY by exactly this method
      // (`Tr2Effect.js:725`), so every member has it by construction.
      value.UsedWithScreenSize(screenSize, worldRadius, uvDensities);
    }
  }

  /**
   * Whether GDR rendering can be used: the cached material-wide flag when called with no technique, otherwise whether every pass of that technique is compatible.
   * @param techniqueName null returns the cached flag; an unknown name returns false
   */
  CompatibleWithGdr(techniqueName = null)
  {
    if (techniqueName === null)
    {
      return this.compatibleWithGdr;
    }
    if (this.shader !== null && !(this.shader instanceof Tr2Shader))
    {
      throw new TypeError("Tr2Material.shader must be a Tr2Shader or null.");
    }
    const techniqueIndex = this.shader === null ? -1 : this.shader.GetTechniqueIndex(techniqueName);
    if (techniqueIndex < 0)
    {
      return false;
    }
    return (this.parametersForPasses?.[techniqueIndex]?.passes ?? []).every(pass => pass?.compatibleWithGdr !== false);
  }

}
