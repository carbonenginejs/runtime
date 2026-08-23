import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { Tr2MaterialStageInput as _Tr2MaterialStageInpu } from './Tr2MaterialStageInput.js';

let _initClass, _init_stageInput, _init_extra_stageInput, _init_reroutedParameters, _init_extra_reroutedParameters, _init_resourceSetDesc, _init_extra_resourceSetDesc, _init_resourceSet, _init_extra_resourceSet, _init_usedResources, _init_extra_usedResources, _init_usedTextures, _init_extra_usedTextures, _init_resourceSetHash, _init_extra_resourceSetHash, _init_resourceSetDirty, _init_extra_resourceSetDirty, _init_compatibleWithGdr, _init_extra_compatibleWithGdr, _init_usedTexturesDirty, _init_extra_usedTexturesDirty;

/** Tr2EffectPassParameters (shader) - generated from schema shapeHash 5e017ea9.... */
let _Tr2EffectPassParamet;
class Tr2EffectPassParameters extends CjsModel {
  static {
    ({
      e: [_init_stageInput, _init_extra_stageInput, _init_reroutedParameters, _init_extra_reroutedParameters, _init_resourceSetDesc, _init_extra_resourceSetDesc, _init_resourceSet, _init_extra_resourceSet, _init_usedResources, _init_extra_usedResources, _init_usedTextures, _init_extra_usedTextures, _init_resourceSetHash, _init_extra_resourceSetHash, _init_resourceSetDirty, _init_extra_resourceSetDirty, _init_compatibleWithGdr, _init_extra_compatibleWithGdr, _init_usedTexturesDirty, _init_extra_usedTexturesDirty],
      c: [_Tr2EffectPassParamet, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2EffectPassParameters",
      family: "shader"
    })], [[type.rawStruct("Tr2MaterialStageInput"), 0, "stageInput"], [type.list("ITriReroutable"), 0, "reroutedParameters"], [type.rawStruct("Tr2ResourceSetDescriptionAL"), 0, "resourceSetDesc"], [type.rawStruct("Tr2ResourceSetAL"), 0, "resourceSet"], [type.list("ITr2EffectValue"), 0, "usedResources"], [type.rawStruct("Tr2BindlessResourcesAL"), 0, "usedTextures"], [[type, type.uint32], 16, "resourceSetHash"], [[type, type.boolean], 16, "resourceSetDirty"], [[type, type.boolean], 16, "compatibleWithGdr"], [[type, type.boolean], 16, "usedTexturesDirty"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_usedTexturesDirty(this);
  }
  /** m_stageInput (Tr2MaterialStageInput) */
  stageInput = _init_stageInput(this, Array.from({
    length: 6
  }, () => new _Tr2MaterialStageInpu()));

  /** m_reroutedParameters (std::vector<ITriReroutable*>) */
  reroutedParameters = (_init_extra_stageInput(this), _init_reroutedParameters(this, []));

  /** m_resourceSetDesc (Tr2ResourceSetDescriptionAL) */
  resourceSetDesc = (_init_extra_reroutedParameters(this), _init_resourceSetDesc(this, null));

  /** m_resourceSet (Tr2ResourceSetAL) */
  resourceSet = (_init_extra_resourceSetDesc(this), _init_resourceSet(this, null));

  /** m_usedResources (std::vector<ITr2EffectValuePtr>) */
  usedResources = (_init_extra_resourceSet(this), _init_usedResources(this, []));

  /** m_usedTextures (Tr2BindlessResourcesAL) */
  usedTextures = (_init_extra_usedResources(this), _init_usedTextures(this, null));

  /** m_resourceSetHash (uint32_t) */
  resourceSetHash = (_init_extra_usedTextures(this), _init_resourceSetHash(this, 0));

  /** m_resourceSetDirty (bool) */
  resourceSetDirty = (_init_extra_resourceSetHash(this), _init_resourceSetDirty(this, true));

  /** m_compatibleWithGdr (bool) */
  compatibleWithGdr = (_init_extra_resourceSetDirty(this), _init_compatibleWithGdr(this, true));

  /** m_usedTexturesDirty (bool) */
  usedTexturesDirty = (_init_extra_compatibleWithGdr(this), _init_usedTexturesDirty(this, false));

  /** Records a resource this pass binds and marks the used-texture list stale. */
  AddUsedResource(resource) {
    this.usedResources.push(resource);
    this.usedTexturesDirty = true;
  }

  /**
   * Records a parameter whose value destination has been rerouted into this
   * pass's storage.
   */
  AddReroutable(reroutable) {
    this.reroutedParameters.push(reroutable);
  }

  /**
   * Allocates the CPU-side constant mirror for one shader stage of this pass.
   * @param type stage index into stageInput
   * @param size mirror size in bytes, rounded up to 16 by the stage
   */
  AllocateConstantMirror(type, size) {
    this.#stage(type).AllocateConstants(size);
  }

  /**
   * Fills one stage's constant mirror from already-built shared buffer contents and clears that stage's dirty flag.
   * @param type stage index into stageInput
   */
  GetSharedConstantBuffer(type, contents, size) {
    this.#stage(type).GetSharedConstantBuffer(contents, size);
  }

  /**
   * The stage input at the given index, created on demand; negative or
   * non-numeric indices clamp to 0.
   */
  #stage(type) {
    const index = Math.max(0, Number(type) || 0);
    this.stageInput[index] ??= new _Tr2MaterialStageInpu();
    return this.stageInput[index];
  }
  static {
    _initClass();
  }
}

export { _Tr2EffectPassParamet as Tr2EffectPassParameters };
//# sourceMappingURL=Tr2EffectPassParameters.js.map
