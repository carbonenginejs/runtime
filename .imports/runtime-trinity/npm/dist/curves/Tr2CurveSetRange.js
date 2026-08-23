import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type } from '@carbonenginejs/runtime-utils/schema';

let _initClass, _init_name, _init_extra_name, _init_startTime, _init_extra_startTime, _init_endTime, _init_extra_endTime, _init_looped, _init_extra_looped;

/**
 * Named sub-interval of a curve set's scaled timeline, giving a start and end
 * time and whether playback loops inside it.
 */
let _Tr2CurveSetRange;
class Tr2CurveSetRange extends CjsModel {
  static {
    ({
      e: [_init_name, _init_extra_name, _init_startTime, _init_extra_startTime, _init_endTime, _init_extra_endTime, _init_looped, _init_extra_looped],
      c: [_Tr2CurveSetRange, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2CurveSetRange",
      family: "curves"
    })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.float32], 16, "startTime"], [[io, io.persist, type, type.float32], 16, "endTime"], [[io, io.persist, type, type.boolean], 16, "looped"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_looped(this);
  }
  name = _init_name(this, "");
  startTime = (_init_extra_name(this), _init_startTime(this, 0));
  endTime = (_init_extra_startTime(this), _init_endTime(this, 1));
  looped = (_init_extra_endTime(this), _init_looped(this, false));
  static {
    _initClass();
  }
}

export { _Tr2CurveSetRange as Tr2CurveSetRange };
//# sourceMappingURL=Tr2CurveSetRange.js.map
