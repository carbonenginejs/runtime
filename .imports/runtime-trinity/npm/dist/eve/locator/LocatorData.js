import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { type } from '@carbonenginejs/runtime-utils/schema';

let _initClass, _init_position, _init_extra_position, _init_direction, _init_extra_direction;

/** Position and orientation pair handed to seek-target child behaviours. */
let _LocatorData;
class LocatorData extends CjsModel {
  static {
    ({
      e: [_init_position, _init_extra_position, _init_direction, _init_extra_direction],
      c: [_LocatorData, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "LocatorData",
      family: "eve/child/behaviors"
    })], [[[type, type.vec3], 16, "position"], [[type, type.quat], 16, "direction"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_direction(this);
  }
  position = _init_position(this, vec3.create());
  direction = (_init_extra_position(this), _init_direction(this, quat.create()));
  static {
    _initClass();
  }
}

export { _LocatorData as LocatorData };
//# sourceMappingURL=LocatorData.js.map
