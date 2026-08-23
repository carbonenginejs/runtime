import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_placement, _init_extra_placement, _init_timeOutDuration, _init_extra_timeOutDuration;

/** InitialPlacement (eve/distribution/attributeModifiers) - generated from schema shapeHash f7f0f676.... */
let _InitialPlacement;
class InitialPlacement extends CjsModel {
  static {
    ({
      e: [_init_placement, _init_extra_placement, _init_timeOutDuration, _init_extra_timeOutDuration],
      c: [_InitialPlacement, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "InitialPlacement",
      family: "eve/distribution/attributeModifiers"
    })], [[type.rawStruct("PlacementDataWithIdentifier"), 0, "placement"], [[type, type.float32], 16, "timeOutDuration"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_timeOutDuration(this);
  }
  /** placement (PlacementDataWithIdentifier) */
  placement = _init_placement(this, null);

  /** timeOutDuration (float) */
  timeOutDuration = (_init_extra_placement(this), _init_timeOutDuration(this, 0));
  static {
    _initClass();
  }
}

export { _InitialPlacement as InitialPlacement };
//# sourceMappingURL=InitialPlacement.js.map
