// Source: trinity/trinity/Shader/Tr2Material.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type } from "#schema";
import { CjsModel } from "#model";
import { Tr2Shader } from "#resource/shader";
import { ShaderType } from "#consts/render-context";
import { FNV1_INITIAL, hashFnv1Floats } from "../../global/utils/hash.js";
import { Tr2ResourceSetALStub } from "../core/al/Tr2ResourceSetAL.js";
import { Tr2EffectStateManager } from "./Tr2EffectStateManager.js";
import { EFFECT_CONSTANTS } from "../core/Tr2Renderer.js";

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
      const program = Tr2EffectStateManager.getShaderProgramRecord(handle);

      if (!program) return false;

      const resourceSet = new Tr2ResourceSetALStub();

      resourceSet.Create(pass.resourceSetDesc, program, renderContext);

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

    return this.UpdateResourceSetDesc(shaderType, input, pass.resourceSetDesc);
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
  UpdateResourceSetDesc(shaderType, input, desc)
  {
    let descChanged = false;

    for (const texture of input.textures)
    {
      descChanged = texture.sourceValue?.CopyToResourceSet(
        desc,
        shaderType,
        texture.registerIndex,
        texture.registerCount
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
    if (!input.constantBuffer) return false;

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
        // resource sets" - which was the engine-means-`engine/webgpu`
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
