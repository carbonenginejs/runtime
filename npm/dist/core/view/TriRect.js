import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';

let _initProto, _initClass, _init_left, _init_extra_left, _init_top, _init_extra_top, _init_right, _init_extra_right, _init_bottom, _init_extra_bottom;

/** An integer screen rectangle given by its left, top, right and bottom edges. */
let _TriRect;
class TriRect extends CjsModel {
  static {
    ({
      e: [_init_left, _init_extra_left, _init_top, _init_extra_top, _init_right, _init_extra_right, _init_bottom, _init_extra_bottom, _initProto],
      c: [_TriRect, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriRect",
      family: "trinityCore"
    })], [[[io, io.persist, type, type.int32], 16, "left"], [[io, io.persist, type, type.int32], 16, "top"], [[io, io.persist, type, type.int32], 16, "right"], [[io, io.persist, type, type.int32], 16, "bottom"], [[carbon, carbon.method, impl, impl.adapted], 18, "__init__"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetRect"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_bottom(this);
  }
  left = (_initProto(this), _init_left(this, 0));
  top = (_init_extra_left(this), _init_top(this, 0));
  right = (_init_extra_top(this), _init_right(this, 0));
  bottom = (_init_extra_right(this), _init_bottom(this, 0));

  /**
   * Python-style constructor hook; assigns all four edges, each defaulting to
   * zero.
   */
  __init__(left = 0, top = 0, right = 0, bottom = 0) {
    this.left = left;
    this.top = top;
    this.right = right;
    this.bottom = bottom;
  }

  /**
   * Assigns the supplied edges, leaving any edge passed as undefined at its
   * current value.
   */
  SetRect(left, top, right, bottom) {
    if (left !== undefined) {
      this.left = left;
    }
    if (top !== undefined) {
      this.top = top;
    }
    if (right !== undefined) {
      this.right = right;
    }
    if (bottom !== undefined) {
      this.bottom = bottom;
    }
  }
  static {
    _initClass();
  }
}

export { _TriRect as TriRect };
//# sourceMappingURL=TriRect.js.map
