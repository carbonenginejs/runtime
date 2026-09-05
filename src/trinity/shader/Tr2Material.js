// Source: trinity/trinity/Shader/Tr2Material.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type } from "#schema";
import { CjsModel } from "#model";
import { Tr2Shader } from "#resource/shader";

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
   * Marks every pass's resource set and used-texture list stale and clears the
   * material sort hash, so they are rebuilt before the next draw.
   */
  InvalidateResourceSets()
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
