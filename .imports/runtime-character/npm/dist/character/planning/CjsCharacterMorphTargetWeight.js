import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_modifierPath, _init_extra_modifierPath, _init_targetName, _init_extra_targetName, _init_weight, _init_extra_weight, _init_owner, _init_extra_owner, _init_origin, _init_extra_origin;

/** One exact renderer-neutral morph-target request in an appearance plan. */
let _CjsCharacterMorphTar;
class CjsCharacterMorphTargetWeight extends CjsModel {
  static {
    ({
      e: [_init_modifierPath, _init_extra_modifierPath, _init_targetName, _init_extra_targetName, _init_weight, _init_extra_weight, _init_owner, _init_extra_owner, _init_origin, _init_extra_origin],
      c: [_CjsCharacterMorphTar, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterMorphTargetWeight",
      family: "character"
    })], [[[io, io.readwrite, type, type.string], 16, "modifierPath"], [[io, io.readwrite, type, type.string], 16, "targetName"], [[io, io.readwrite, type, type.float64], 16, "weight"], [[io, io.readwrite, void 0, type.model("CjsCharacterAppearanceSelection")], 16, "owner"], [[io, io.readwrite, void 0, type.model("CjsCharacterOrigin")], 16, "origin"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_origin(this);
  }
  modifierPath = _init_modifierPath(this, "");
  targetName = (_init_extra_modifierPath(this), _init_targetName(this, ""));
  weight = (_init_extra_targetName(this), _init_weight(this, 0));
  owner = (_init_extra_weight(this), _init_owner(this, null));
  origin = (_init_extra_owner(this), _init_origin(this, null));
  static {
    _initClass();
  }
}

export { _CjsCharacterMorphTar as CjsCharacterMorphTargetWeight };
//# sourceMappingURL=CjsCharacterMorphTargetWeight.js.map
