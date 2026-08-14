import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_owner, _init_extra_owner, _init_contributor, _init_extra_contributor, _init_weight, _init_extra_weight, _init_origin, _init_extra_origin;

/** Appearance contribution separating selection ownership from the asset that supplies it. */
let _CjsCharacterAppearan;
class CjsCharacterAppearanceLayer extends CjsModel {
  static {
    ({
      e: [_init_owner, _init_extra_owner, _init_contributor, _init_extra_contributor, _init_weight, _init_extra_weight, _init_origin, _init_extra_origin],
      c: [_CjsCharacterAppearan, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterAppearanceLayer",
      family: "character"
    })], [[[io, io.readwrite, void 0, type.model("CjsCharacterAppearanceSelection")], 16, "owner"], [[io, io.readwrite, void 0, type.model("CjsCharacterResolvedPart")], 16, "contributor"], [[io, io.readwrite, type, type.float64], 16, "weight"], [[io, io.readwrite, void 0, type.model("CjsCharacterOrigin")], 16, "origin"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_origin(this);
  }
  owner = _init_owner(this, null);
  contributor = (_init_extra_owner(this), _init_contributor(this, null));

  /** Authored contribution weight when the dependency carries one. */
  weight = (_init_extra_contributor(this), _init_weight(this, null));
  origin = (_init_extra_weight(this), _init_origin(this, null));
  static {
    _initClass();
  }
}

export { _CjsCharacterAppearan as CjsCharacterAppearanceLayer };
//# sourceMappingURL=CjsCharacterAppearanceLayer.js.map
