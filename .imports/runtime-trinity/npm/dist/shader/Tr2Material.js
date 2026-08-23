import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_shader, _init_extra_shader, _init_parametersForPasses, _init_extra_parametersForPasses, _init_parametersForLibraries, _init_extra_parametersForLibraries, _init_lodTextureParameters, _init_extra_lodTextureParameters, _init_resourceSetHash, _init_extra_resourceSetHash, _init_compatibleWithGdr, _init_extra_compatibleWithGdr;

/** Tr2Material (shader) - generated from schema shapeHash 4fb63b7e.... */
let _Tr2Material;
class Tr2Material extends CjsModel {
  static {
    ({
      e: [_init_shader, _init_extra_shader, _init_parametersForPasses, _init_extra_parametersForPasses, _init_parametersForLibraries, _init_extra_parametersForLibraries, _init_lodTextureParameters, _init_extra_lodTextureParameters, _init_resourceSetHash, _init_extra_resourceSetHash, _init_compatibleWithGdr, _init_extra_compatibleWithGdr],
      c: [_Tr2Material, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2Material",
      family: "shader"
    })], [[type.objectRef("Tr2Shader"), 0, "shader"], [type.list("Tr2EffectTechniqueParameters"), 0, "parametersForPasses"], [type.list("Tr2EffectTechniqueParameters"), 0, "parametersForLibraries"], [type.list("ITriEffectTextureParameter"), 0, "lodTextureParameters"], [[type, type.uint32], 16, "resourceSetHash"], [[type, type.boolean], 16, "compatibleWithGdr"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_compatibleWithGdr(this);
  }
  /** m_shader (Tr2ShaderPtr) */
  shader = _init_shader(this, null);

  /** m_parametersForPasses (Tr2EffectTechniqueParametersVector) */
  parametersForPasses = (_init_extra_shader(this), _init_parametersForPasses(this, []));

  /** m_parametersForLibraries (Tr2EffectTechniqueParametersVector) */
  parametersForLibraries = (_init_extra_parametersForPasses(this), _init_parametersForLibraries(this, []));

  /** m_lodTextureParameters (std::vector<ITriEffectTextureParameterPtr>) */
  lodTextureParameters = (_init_extra_parametersForLibraries(this), _init_lodTextureParameters(this, []));

  /** m_resourceSetHash (mutable uint32_t) */
  resourceSetHash = (_init_extra_lodTextureParameters(this), _init_resourceSetHash(this, 0));

  /** m_compatibleWithGdr (bool) */
  compatibleWithGdr = (_init_extra_resourceSetHash(this), _init_compatibleWithGdr(this, false));

  /**
   * The resource-set hash, which doubles as the material's draw-sort key; 0
   * whenever the resource sets have been invalidated.
   */
  GetSortValue() {
    return this.resourceSetHash;
  }

  /**
   * The Tr2Shader supplying reflection and render state for this material, or
   * null before one is resolved.
   */
  GetShaderStateInterface() {
    return this.shader;
  }

  /**
   * The per-pass parameter block for a technique/pass pair, or null when either
   * index is out of range.
   */
  GetPassDescription(techniqueIndex = 0, passIndex = 0) {
    return this.parametersForPasses?.[techniqueIndex]?.passes?.[passIndex] ?? null;
  }

  /**
   * Marks every pass's resource set and used-texture list stale and clears the
   * material sort hash, so they are rebuilt before the next draw.
   */
  InvalidateResourceSets() {
    for (const technique of this.parametersForPasses) {
      for (const pass of technique?.passes ?? []) {
        pass.resourceSetHash = 0;
        pass.resourceSetDirty = true;
        pass.usedTexturesDirty = true;
      }
      for (const library of technique?.libraries ?? []) {
        library.usedTexturesDirty = true;
      }
    }
    this.resourceSetHash = 0;
  }

  /**
   * Same invalidation as InvalidateResourceSets, raised when a bound resource
   * itself changed rather than the set layout.
   */
  ResourceChanged() {
    for (const technique of this.parametersForPasses) {
      for (const pass of technique?.passes ?? []) {
        pass.resourceSetHash = 0;
        pass.resourceSetDirty = true;
        pass.usedTexturesDirty = true;
      }
      for (const library of technique?.libraries ?? []) {
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
  MarkConstantBuffersDirty() {
    for (const technique of this.parametersForPasses) {
      for (const pass of technique?.passes ?? []) {
        for (const stage of pass?.stageInput ?? []) {
          if (stage?.shaderParametersWithNotification?.length) {
            stage.constantBufferDirty = true;
          }
        }
      }
      for (const library of technique?.libraries ?? []) {
        if (library?.globalInput?.shaderParametersWithNotification?.length) {
          library.globalInput.constantBufferDirty = true;
        }
        if (library?.localInput?.shaderParametersWithNotification?.length) {
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
  UsedWithScreenSize(screenSize, worldRadius, uvDensities = []) {
    for (const value of this.lodTextureParameters) {
      value?.UsedWithScreenSize?.(screenSize, worldRadius, uvDensities);
    }
  }

  /**
   * Whether GDR rendering can be used: the cached material-wide flag when called with no technique, otherwise whether every pass of that technique is compatible.
   * @param techniqueName null returns the cached flag; an unknown name returns false
   */
  CompatibleWithGdr(techniqueName = null) {
    if (techniqueName === null) {
      return this.compatibleWithGdr;
    }
    const techniqueIndex = this.shader?.GetTechniqueIndex?.(techniqueName) ?? -1;
    if (techniqueIndex < 0) {
      return false;
    }
    return (this.parametersForPasses?.[techniqueIndex]?.passes ?? []).every(pass => pass?.compatibleWithGdr !== false);
  }
  static {
    _initClass();
  }
}

export { _Tr2Material as Tr2Material };
//# sourceMappingURL=Tr2Material.js.map
