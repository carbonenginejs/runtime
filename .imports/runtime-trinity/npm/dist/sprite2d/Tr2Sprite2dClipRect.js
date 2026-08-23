import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_left, _init_extra_left, _init_top, _init_extra_top, _init_right, _init_extra_right, _init_bottom, _init_extra_bottom;

/** Tr2Sprite2dClipRect (sprite2d) - generated from schema shapeHash ed8305bc.... */
let _Tr2Sprite2dClipRect;
class Tr2Sprite2dClipRect extends CjsModel {
  static {
    ({
      e: [_init_left, _init_extra_left, _init_top, _init_extra_top, _init_right, _init_extra_right, _init_bottom, _init_extra_bottom],
      c: [_Tr2Sprite2dClipRect, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2Sprite2dClipRect",
      family: "sprite2d"
    })], [[[type, type.float32], 16, "left"], [[type, type.float32], 16, "top"], [[type, type.float32], 16, "right"], [[type, type.float32], 16, "bottom"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_bottom(this);
  }
  /** left (float) */
  left = _init_left(this, 0);

  /** top (float) */
  top = (_init_extra_left(this), _init_top(this, 0));

  /** right (float) */
  right = (_init_extra_top(this), _init_right(this, 0));

  /** bottom (float) */
  bottom = (_init_extra_right(this), _init_bottom(this, 0));
  static {
    _initClass();
  }
}

export { _Tr2Sprite2dClipRect as Tr2Sprite2dClipRect };
//# sourceMappingURL=Tr2Sprite2dClipRect.js.map
