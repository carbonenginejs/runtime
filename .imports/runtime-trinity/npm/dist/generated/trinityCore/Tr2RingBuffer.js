import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_name, _init_extra_name, _init_stride, _init_extra_stride, _init_mutex, _init_extra_mutex, _init_buffer, _init_extra_buffer, _init_mirror, _init_extra_mirror, _init_dirtyRegions, _init_extra_dirtyRegions, _init_frame, _init_extra_frame, _init_tail, _init_extra_tail, _init_lockedRegions, _init_extra_lockedRegions, _init_head, _init_extra_head, _init_size, _init_extra_size, _init_offset, _init_extra_offset;

/** Tr2RingBuffer (trinityCore) - generated from schema shapeHash 55784187.... */
let _Tr2RingBuffer;
class Tr2RingBuffer extends CjsModel {
  static {
    ({
      e: [_init_name, _init_extra_name, _init_stride, _init_extra_stride, _init_mutex, _init_extra_mutex, _init_buffer, _init_extra_buffer, _init_mirror, _init_extra_mirror, _init_dirtyRegions, _init_extra_dirtyRegions, _init_frame, _init_extra_frame, _init_tail, _init_extra_tail, _init_lockedRegions, _init_extra_lockedRegions, _init_head, _init_extra_head, _init_size, _init_extra_size, _init_offset, _init_extra_offset],
      c: [_Tr2RingBuffer, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2RingBuffer",
      family: "trinityCore"
    })], [[[type, type.string], 16, "name"], [[type, type.uint32], 16, "stride"], [type.rawStruct("std::mutex"), 0, "mutex"], [type.rawStruct("Tr2BufferAL"), 0, "buffer"], [type.list("uint8_t"), 0, "mirror"], [type.rawStruct("DirtyRegion"), 0, "dirtyRegions"], [[type, type.uint64], 16, "frame"], [[type, type.uint32], 16, "tail"], [type.list("LockedRegion"), 0, "lockedRegions"], [[type, type.uint32], 16, "head"], [[type, type.uint32], 16, "size"], [[type, type.uint32], 16, "offset"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_offset(this);
  }
  /** m_name (std::string) */
  name = _init_name(this, "");

  /** m_stride (uint32_t) */
  stride = (_init_extra_name(this), _init_stride(this, 0));

  /** m_mutex (std::mutex) */
  mutex = (_init_extra_stride(this), _init_mutex(this, null));

  /** m_buffer (Tr2BufferAL) */
  buffer = (_init_extra_mutex(this), _init_buffer(this, null));

  /** m_mirror (std::vector<uint8_t>) */
  mirror = (_init_extra_buffer(this), _init_mirror(this, []));

  /** m_dirtyRegions (DirtyRegion) */
  dirtyRegions = (_init_extra_mirror(this), _init_dirtyRegions(this, null));

  /** frame (uint64_t) */
  frame = (_init_extra_dirtyRegions(this), _init_frame(this, 0));

  /** tail (uint32_t) */
  tail = (_init_extra_frame(this), _init_tail(this, 0));

  /** m_lockedRegions (std::vector<LockedRegion>) */
  lockedRegions = (_init_extra_tail(this), _init_lockedRegions(this, []));

  /** m_head (uint32_t) */
  head = (_init_extra_lockedRegions(this), _init_head(this, 0));

  /** m_size (uint32_t) */
  size = (_init_extra_head(this), _init_size(this, 0));

  /** offset (uint32_t) */
  offset = (_init_extra_size(this), _init_offset(this, 0));
  static {
    _initClass();
  }
}

export { _Tr2RingBuffer as Tr2RingBuffer };
//# sourceMappingURL=Tr2RingBuffer.js.map
