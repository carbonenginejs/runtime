import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { Tr2TexturedSpriteObject as _Tr2TexturedSpriteObj } from './Tr2TexturedSpriteObject.js';
import { Tr2StretchScaleBehavior } from './enums.js';

let _initClass, _init_dpiScaleBehavior, _init_extra_dpiScaleBehavior, _init_edgeScale, _init_extra_edgeScale, _init_effectOpacity, _init_extra_effectOpacity, _init_fillCenter, _init_extra_fillCenter, _init_leftEdgeSize, _init_extra_leftEdgeSize, _init_rightEdgeSize, _init_extra_rightEdgeSize, _init_offset, _init_extra_offset, _init_saturation, _init_extra_saturation;

/** Tr2Sprite2dStretch (sprite2d) - generated from schema shapeHash 0c6723b7.... */
let _Tr2Sprite2dStretch;
new class extends _identity {
  static [class Tr2Sprite2dStretch extends _Tr2TexturedSpriteObj {
    static {
      ({
        e: [_init_dpiScaleBehavior, _init_extra_dpiScaleBehavior, _init_edgeScale, _init_extra_edgeScale, _init_effectOpacity, _init_extra_effectOpacity, _init_fillCenter, _init_extra_fillCenter, _init_leftEdgeSize, _init_extra_leftEdgeSize, _init_rightEdgeSize, _init_extra_rightEdgeSize, _init_offset, _init_extra_offset, _init_saturation, _init_extra_saturation],
        c: [_Tr2Sprite2dStretch, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2Sprite2dStretch",
        family: "sprite2d"
      })], [[[io, io.persist, type, type.int32, void 0, type.enum("Tr2StretchScaleBehavior")], 16, "dpiScaleBehavior"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "edgeScale"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "effectOpacity"], [[io, io.notify, io, io.readwrite, type, type.boolean], 16, "fillCenter"], [[io, io.notify, io, io.readwrite, type, type.uint32], 16, "leftEdgeSize"], [[io, io.notify, io, io.readwrite, type, type.uint32], 16, "rightEdgeSize"], [[io, io.notify, io, io.readwrite, type, type.int32], 16, "offset"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "saturation"]], 0, void 0, _Tr2TexturedSpriteObj));
    }
    constructor(...args) {
      super(...args);
      _init_extra_saturation(this);
    }
    /** m_dpiScaleBehavior (Tr2StretchScaleBehavior - enum Tr2StretchScaleBehavior) [READWRITE, PERSIST, ENUM] */
    dpiScaleBehavior = _init_dpiScaleBehavior(this, 0);

    /** m_edgeScale (float) [READWRITE, NOTIFY] */
    edgeScale = (_init_extra_dpiScaleBehavior(this), _init_edgeScale(this, 1));

    /** m_effectOpacity (float) [READWRITE, NOTIFY] */
    effectOpacity = (_init_extra_edgeScale(this), _init_effectOpacity(this, 1));

    /** m_fillCenter (bool) [READWRITE, NOTIFY] */
    fillCenter = (_init_extra_effectOpacity(this), _init_fillCenter(this, true));

    /** m_leftEdgeSize (unsigned int) [READWRITE, NOTIFY] */
    leftEdgeSize = (_init_extra_fillCenter(this), _init_leftEdgeSize(this, 0));

    /** m_rightEdgeSize (unsigned int) [READWRITE, NOTIFY] */
    rightEdgeSize = (_init_extra_leftEdgeSize(this), _init_rightEdgeSize(this, 0));

    /** m_offset (int) [READWRITE, NOTIFY] */
    offset = (_init_extra_rightEdgeSize(this), _init_offset(this, 0));

    /** m_saturation (float) [READWRITE, NOTIFY] */
    saturation = (_init_extra_offset(this), _init_saturation(this, 1));
  }];
  Tr2StretchScaleBehavior = Tr2StretchScaleBehavior;
  constructor() {
    super(_Tr2Sprite2dStretch), _initClass();
  }
}();

export { _Tr2Sprite2dStretch as Tr2Sprite2dStretch };
//# sourceMappingURL=Tr2Sprite2dStretch.js.map
