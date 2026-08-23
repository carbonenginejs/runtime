import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_buffer, _init_extra_buffer, _init_offset, _init_extra_offset, _init_stride, _init_extra_stride, _init_count, _init_extra_count;

/** ITr2InstanceData (trinityCore) - generated from schema shapeHash bfecd5c1.... */
let _ITr2InstanceData;
class ITr2InstanceData extends CjsModel {
  static {
    ({
      e: [_init_buffer, _init_extra_buffer, _init_offset, _init_extra_offset, _init_stride, _init_extra_stride, _init_count, _init_extra_count],
      c: [_ITr2InstanceData, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "ITr2InstanceData",
      family: "trinityCore"
    })], [[type.rawStruct("Tr2BufferAL"), 0, "buffer"], [[type, type.uint32], 16, "offset"], [[type, type.uint32], 16, "stride"], [[type, type.uint32], 16, "count"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_count(this);
  }
  /** buffer (const Tr2BufferAL&) */
  buffer = _init_buffer(this, null);

  /** offset (uint32_t) */
  offset = (_init_extra_buffer(this), _init_offset(this, 0));

  /** stride (uint32_t) */
  stride = (_init_extra_offset(this), _init_stride(this, 0));

  /** count (uint32_t) */
  count = (_init_extra_stride(this), _init_count(this, 0));
  static {
    _initClass();
  }
}

export { _ITr2InstanceData as ITr2InstanceData };
//# sourceMappingURL=ITr2InstanceData.js.map
