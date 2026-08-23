import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_channel, _init_extra_channel, _init_threshold, _init_extra_threshold, _init_mask, _init_extra_mask, _init_bottomEdge, _init_extra_bottomEdge, _init_leftEdge, _init_extra_leftEdge, _init_rightEdge, _init_extra_rightEdge, _init_topEdge, _init_extra_topEdge;

/** Tr2Sprite2dPickingMask (sprite2d) - generated from schema shapeHash d6cf4584.... */
let _Tr2Sprite2dPickingMa;
class Tr2Sprite2dPickingMask extends CjsModel {
  static {
    ({
      e: [_init_channel, _init_extra_channel, _init_threshold, _init_extra_threshold, _init_mask, _init_extra_mask, _init_bottomEdge, _init_extra_bottomEdge, _init_leftEdge, _init_extra_leftEdge, _init_rightEdge, _init_extra_rightEdge, _init_topEdge, _init_extra_topEdge],
      c: [_Tr2Sprite2dPickingMa, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2Sprite2dPickingMask",
      family: "sprite2d"
    })], [[[io, io.readwrite, type, type.uint32], 16, "channel"], [[io, io.readwrite, type, type.float32], 16, "threshold"], [[io, io.read, void 0, type.objectRef("Tr2ImageRes")], 16, "mask"], [[io, io.readwrite, type, type.uint32], 16, "bottomEdge"], [[io, io.readwrite, type, type.uint32], 16, "leftEdge"], [[io, io.readwrite, type, type.uint32], 16, "rightEdge"], [[io, io.readwrite, type, type.uint32], 16, "topEdge"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_topEdge(this);
  }
  /** m_channel (uint32_t) [READWRITE, ENUM] */
  channel = _init_channel(this, 3);

  /** m_threshold (float) [READWRITE] */
  threshold = (_init_extra_channel(this), _init_threshold(this, 0));

  /** m_mask (Tr2ImageResPtr) [READ] */
  mask = (_init_extra_threshold(this), _init_mask(this, null));

  /** m_bottomEdge (uint32_t) [READWRITE] */
  bottomEdge = (_init_extra_mask(this), _init_bottomEdge(this, 0));

  /** m_leftEdge (uint32_t) [READWRITE] */
  leftEdge = (_init_extra_bottomEdge(this), _init_leftEdge(this, 0));

  /** m_rightEdge (uint32_t) [READWRITE] */
  rightEdge = (_init_extra_leftEdge(this), _init_rightEdge(this, 0));

  /** m_topEdge (uint32_t) [READWRITE] */
  topEdge = (_init_extra_rightEdge(this), _init_topEdge(this, 0));
  static {
    _initClass();
  }
}

export { _Tr2Sprite2dPickingMa as Tr2Sprite2dPickingMask };
//# sourceMappingURL=Tr2Sprite2dPickingMask.js.map
