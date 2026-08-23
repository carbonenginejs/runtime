import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { Tr2TexturedSpriteObject as _Tr2TexturedSpriteObj } from './Tr2TexturedSpriteObject.js';

let _initClass, _init_cornerScale, _init_extra_cornerScale, _init_fillCenter, _init_extra_fillCenter, _init_offset, _init_extra_offset, _init_cornerSize, _init_extra_cornerSize;

/** Tr2Sprite2dFrame (sprite2d) - generated from schema shapeHash c26e5d50.... */
let _Tr2Sprite2dFrame;
class Tr2Sprite2dFrame extends _Tr2TexturedSpriteObj {
  static {
    ({
      e: [_init_cornerScale, _init_extra_cornerScale, _init_fillCenter, _init_extra_fillCenter, _init_offset, _init_extra_offset, _init_cornerSize, _init_extra_cornerSize],
      c: [_Tr2Sprite2dFrame, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2Sprite2dFrame",
      family: "sprite2d"
    })], [[[io, io.notify, io, io.readwrite, type, type.float32], 16, "cornerScale"], [[io, io.notify, io, io.readwrite, type, type.boolean], 16, "fillCenter"], [[io, io.notify, io, io.readwrite, type, type.int32], 16, "offset"], [[io, io.notify, io, io.readwrite, type, type.uint32], 16, "cornerSize"]], 0, void 0, _Tr2TexturedSpriteObj));
  }
  constructor(...args) {
    super(...args);
    _init_extra_cornerSize(this);
  }
  /** m_cornerScale (float) [READWRITE, NOTIFY] */
  cornerScale = _init_cornerScale(this, 1);

  /** m_fillCenter (bool) [READWRITE, NOTIFY] */
  fillCenter = (_init_extra_cornerScale(this), _init_fillCenter(this, true));

  /** m_offset (int) [READWRITE, NOTIFY] */
  offset = (_init_extra_fillCenter(this), _init_offset(this, 0));

  /** m_cornerSize (unsigned int) [READWRITE, NOTIFY] */
  cornerSize = (_init_extra_offset(this), _init_cornerSize(this, 0));
  static {
    _initClass();
  }
}

export { _Tr2Sprite2dFrame as Tr2Sprite2dFrame };
//# sourceMappingURL=Tr2Sprite2dFrame.js.map
