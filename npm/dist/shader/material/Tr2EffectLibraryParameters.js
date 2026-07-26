import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { Tr2MaterialStageInput as _Tr2MaterialStageInpu } from './Tr2MaterialStageInput.js';

let _initClass, _init_localInput, _init_extra_localInput, _init_globalInput, _init_extra_globalInput, _init_globalResourceSetDesc, _init_extra_globalResourceSetDesc, _init_globalResourceSet, _init_extra_globalResourceSet, _init_reroutedParameters, _init_extra_reroutedParameters, _init_usedResources, _init_extra_usedResources, _init_usedTextures, _init_extra_usedTextures, _init_globalResourceSetDirty, _init_extra_globalResourceSetDirty, _init_usedTexturesDirty, _init_extra_usedTexturesDirty;

/** Tr2EffectLibraryParameters (shader) - generated from schema shapeHash b0b10bab.... */
let _Tr2EffectLibraryPara;
class Tr2EffectLibraryParameters extends CjsModel {
  static {
    ({
      e: [_init_localInput, _init_extra_localInput, _init_globalInput, _init_extra_globalInput, _init_globalResourceSetDesc, _init_extra_globalResourceSetDesc, _init_globalResourceSet, _init_extra_globalResourceSet, _init_reroutedParameters, _init_extra_reroutedParameters, _init_usedResources, _init_extra_usedResources, _init_usedTextures, _init_extra_usedTextures, _init_globalResourceSetDirty, _init_extra_globalResourceSetDirty, _init_usedTexturesDirty, _init_extra_usedTexturesDirty],
      c: [_Tr2EffectLibraryPara, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2EffectLibraryParameters",
      family: "shader"
    })], [[type.rawStruct("Tr2MaterialStageInput"), 0, "localInput"], [type.rawStruct("Tr2MaterialStageInput"), 0, "globalInput"], [type.rawStruct("Tr2ResourceSetDescriptionAL"), 0, "globalResourceSetDesc"], [type.rawStruct("Tr2ResourceSetAL"), 0, "globalResourceSet"], [type.list("ITriReroutable"), 0, "reroutedParameters"], [type.list("ITr2EffectValue"), 0, "usedResources"], [type.rawStruct("Tr2BindlessResourcesAL"), 0, "usedTextures"], [[type, type.boolean], 16, "globalResourceSetDirty"], [[type, type.boolean], 16, "usedTexturesDirty"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_usedTexturesDirty(this);
  }
  /** m_localInput (Tr2MaterialStageInput) */
  localInput = _init_localInput(this, new _Tr2MaterialStageInpu());

  /** m_globalInput (Tr2MaterialStageInput) */
  globalInput = (_init_extra_localInput(this), _init_globalInput(this, new _Tr2MaterialStageInpu()));

  /** m_globalResourceSetDesc (Tr2ResourceSetDescriptionAL) */
  globalResourceSetDesc = (_init_extra_globalInput(this), _init_globalResourceSetDesc(this, null));

  /** m_globalResourceSet (Tr2ResourceSetAL) */
  globalResourceSet = (_init_extra_globalResourceSetDesc(this), _init_globalResourceSet(this, null));

  /** m_reroutedParameters (std::vector<ITriReroutable*>) */
  reroutedParameters = (_init_extra_globalResourceSet(this), _init_reroutedParameters(this, []));

  /** m_usedResources (std::vector<ITr2EffectValuePtr>) */
  usedResources = (_init_extra_reroutedParameters(this), _init_usedResources(this, []));

  /** m_usedTextures (Tr2BindlessResourcesAL) */
  usedTextures = (_init_extra_usedResources(this), _init_usedTextures(this, null));

  /** m_globalResourceSetDirty (bool) */
  globalResourceSetDirty = (_init_extra_usedTextures(this), _init_globalResourceSetDirty(this, true));

  /** m_usedTexturesDirty (bool) */
  usedTexturesDirty = (_init_extra_globalResourceSetDirty(this), _init_usedTexturesDirty(this, false));

  /** Records a resource this library binds and marks the used-texture list stale. */
  AddUsedResource(resource) {
    this.usedResources.push(resource);
    this.usedTexturesDirty = true;
  }

  /**
   * Records a parameter whose value destination has been rerouted into this
   * library's storage.
   */
  AddReroutable(reroutable) {
    this.reroutedParameters.push(reroutable);
  }
  static {
    _initClass();
  }
}

export { _Tr2EffectLibraryPara as Tr2EffectLibraryParameters };
//# sourceMappingURL=Tr2EffectLibraryParameters.js.map
