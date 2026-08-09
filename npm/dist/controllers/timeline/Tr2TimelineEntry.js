import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_startTime, _init_extra_startTime, _init_endTime, _init_extra_endTime, _init_trackID, _init_extra_trackID;

/** Tr2TimelineEntry (controllers) - generated from schema shapeHash 542611f6.... */
let _Tr2TimelineEntry;
class Tr2TimelineEntry extends CjsModel {
  static {
    ({
      e: [_init_startTime, _init_extra_startTime, _init_endTime, _init_extra_endTime, _init_trackID, _init_extra_trackID],
      c: [_Tr2TimelineEntry, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2TimelineEntry",
      family: "controllers"
    })], [[[type, type.float32], 16, "startTime"], [[type, type.float32], 16, "endTime"], [[type, type.uint32], 16, "trackID"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_trackID(this);
  }
  /** startTime (float) */
  startTime = _init_startTime(this, 0);

  /** endTime (float) */
  endTime = (_init_extra_startTime(this), _init_endTime(this, 0));

  /** trackID (uint32_t) */
  trackID = (_init_extra_endTime(this), _init_trackID(this, 0));
  static {
    _initClass();
  }
}

export { _Tr2TimelineEntry as Tr2TimelineEntry };
//# sourceMappingURL=Tr2TimelineEntry.js.map
