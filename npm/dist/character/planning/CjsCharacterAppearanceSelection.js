import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_groupID, _init_extra_groupID, _init_origin, _init_extra_origin;

/** Plan-local resolved character choice with explicit selection-group ownership. */
let _CjsCharacterAppearan;
class CjsCharacterAppearanceSelection extends CjsModel {
  static {
    ({
      e: [_init_groupID, _init_extra_groupID, _init_origin, _init_extra_origin],
      c: [_CjsCharacterAppearan, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterAppearanceSelection",
      family: "character"
    })], [[[io, io.readwrite, type, type.string], 16, "groupID"], [[io, io.readwrite, void 0, type.model("CjsCharacterOrigin")], 16, "origin"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_origin(this);
  }
  groupID = _init_groupID(this, "");
  origin = (_init_extra_groupID(this), _init_origin(this, null));
  static {
    _initClass();
  }
}

export { _CjsCharacterAppearan as CjsCharacterAppearanceSelection };
//# sourceMappingURL=CjsCharacterAppearanceSelection.js.map
