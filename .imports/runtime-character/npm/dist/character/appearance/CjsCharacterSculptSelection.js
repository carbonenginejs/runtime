import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_weightForwardBack, _init_extra_weightForwardBack, _init_weightLeftRight, _init_extra_weightLeftRight, _init_weightUpDown, _init_extra_weightUpDown, _init_sculptLocationID, _init_extra_sculptLocationID;

/** One authored three-axis paper-doll sculpt selection. */
let _CjsCharacterSculptSe;
class CjsCharacterSculptSelection extends CjsModel {
  static {
    ({
      e: [_init_weightForwardBack, _init_extra_weightForwardBack, _init_weightLeftRight, _init_extra_weightLeftRight, _init_weightUpDown, _init_extra_weightUpDown, _init_sculptLocationID, _init_extra_sculptLocationID],
      c: [_CjsCharacterSculptSe, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterSculptSelection",
      family: "character"
    })], [[[io, io.readwrite, type, type.float64], 16, "weightForwardBack"], [[io, io.readwrite, type, type.float64], 16, "weightLeftRight"], [[io, io.readwrite, type, type.float64], 16, "weightUpDown"], [[io, io.readwrite, void 0, type.model("CjsCharacterSculptingLocation")], 16, "sculptLocationID"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_sculptLocationID(this);
  }
  weightForwardBack = _init_weightForwardBack(this, 0);
  weightLeftRight = (_init_extra_weightForwardBack(this), _init_weightLeftRight(this, 0));
  weightUpDown = (_init_extra_weightLeftRight(this), _init_weightUpDown(this, 0));
  sculptLocationID = (_init_extra_weightUpDown(this), _init_sculptLocationID(this, null));
  static {
    _initClass();
  }
}

export { _CjsCharacterSculptSe as CjsCharacterSculptSelection };
//# sourceMappingURL=CjsCharacterSculptSelection.js.map
