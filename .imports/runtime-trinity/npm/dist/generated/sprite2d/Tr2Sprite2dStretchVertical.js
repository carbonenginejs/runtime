import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { Tr2TexturedSpriteObject as _Tr2TexturedSpriteObj } from './Tr2TexturedSpriteObject.js';

let _initClass, _init_edgeScale, _init_extra_edgeScale, _init_effectOpacity, _init_extra_effectOpacity, _init_fillCenter, _init_extra_fillCenter, _init_bottomEdgeSize, _init_extra_bottomEdgeSize, _init_topEdgeSize, _init_extra_topEdgeSize, _init_saturation, _init_extra_saturation;

/** Tr2Sprite2dStretchVertical (sprite2d) - generated from schema shapeHash c2890eb5.... */
let _Tr2Sprite2dStretchVe;
class Tr2Sprite2dStretchVertical extends _Tr2TexturedSpriteObj {
  static {
    ({
      e: [_init_edgeScale, _init_extra_edgeScale, _init_effectOpacity, _init_extra_effectOpacity, _init_fillCenter, _init_extra_fillCenter, _init_bottomEdgeSize, _init_extra_bottomEdgeSize, _init_topEdgeSize, _init_extra_topEdgeSize, _init_saturation, _init_extra_saturation],
      c: [_Tr2Sprite2dStretchVe, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2Sprite2dStretchVertical",
      family: "sprite2d"
    })], [[[io, io.notify, io, io.readwrite, type, type.float32], 16, "edgeScale"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "effectOpacity"], [[io, io.notify, io, io.readwrite, type, type.boolean], 16, "fillCenter"], [[io, io.notify, io, io.readwrite, type, type.uint32], 16, "bottomEdgeSize"], [[io, io.notify, io, io.readwrite, type, type.uint32], 16, "topEdgeSize"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "saturation"]], 0, void 0, _Tr2TexturedSpriteObj));
  }
  constructor(...args) {
    super(...args);
    _init_extra_saturation(this);
  }
  /** m_edgeScale (float) [READWRITE, NOTIFY] */
  edgeScale = _init_edgeScale(this, 1);

  /** m_effectOpacity (float) [READWRITE, NOTIFY] */
  effectOpacity = (_init_extra_edgeScale(this), _init_effectOpacity(this, 1));

  /** m_fillCenter (bool) [READWRITE, NOTIFY] */
  fillCenter = (_init_extra_effectOpacity(this), _init_fillCenter(this, true));

  /** m_bottomEdgeSize (unsigned int) [READWRITE, NOTIFY] */
  bottomEdgeSize = (_init_extra_fillCenter(this), _init_bottomEdgeSize(this, 0));

  /** m_topEdgeSize (unsigned int) [READWRITE, NOTIFY] */
  topEdgeSize = (_init_extra_bottomEdgeSize(this), _init_topEdgeSize(this, 0));

  /** m_saturation (float) [READWRITE, NOTIFY] */
  saturation = (_init_extra_topEdgeSize(this), _init_saturation(this, 1));
  static {
    _initClass();
  }
}

export { _Tr2Sprite2dStretchVe as Tr2Sprite2dStretchVertical };
//# sourceMappingURL=Tr2Sprite2dStretchVertical.js.map
