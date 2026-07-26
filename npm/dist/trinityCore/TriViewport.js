import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';

let _initProto, _initClass, _init_x, _init_extra_x, _init_y, _init_extra_y, _init_width, _init_extra_width, _init_height, _init_extra_height, _init_minZ, _init_extra_minZ, _init_maxZ, _init_extra_maxZ;

/**
 * A screen viewport rectangle in pixels together with its minimum and maximum
 * depth.
 */
let _TriViewport;
class TriViewport extends CjsModel {
  static {
    ({
      e: [_init_x, _init_extra_x, _init_y, _init_extra_y, _init_width, _init_extra_width, _init_height, _init_extra_height, _init_minZ, _init_extra_minZ, _init_maxZ, _init_extra_maxZ, _initProto],
      c: [_TriViewport, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriViewport",
      family: "trinityCore"
    })], [[[io, io.persist, type, type.int32], 16, "x"], [[io, io.persist, type, type.int32], 16, "y"], [[io, io.persist, type, type.int32], 16, "width"], [[io, io.persist, type, type.int32], 16, "height"], [[io, io.persist, type, type.float32], 16, "minZ"], [[io, io.persist, type, type.float32], 16, "maxZ"], [[carbon, carbon.method, impl, impl.adapted], 18, "__init__"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetAspectRatio"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_maxZ(this);
  }
  x = (_initProto(this), _init_x(this, 0));
  y = (_init_extra_x(this), _init_y(this, 0));
  width = (_init_extra_y(this), _init_width(this, 1));
  height = (_init_extra_width(this), _init_height(this, 1));
  minZ = (_init_extra_height(this), _init_minZ(this, 0));
  maxZ = (_init_extra_minZ(this), _init_maxZ(this, 1));

  /**
   * Python-style constructor hook; assigns origin, size and depth range,
   * defaulting to a 1x1 viewport over the full zero-to-one depth range.
   */
  __init__(x = 0, y = 0, width = 1, height = 1, minZ = 0, maxZ = 1) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.minZ = minZ;
    this.maxZ = maxZ;
  }

  /** Pixel width divided by pixel height; a zero height is not guarded against. */
  GetAspectRatio() {
    return this.width / this.height;
  }
  static {
    _initClass();
  }
}
function Vec3TransformByViewport(vec, viewport) {
  vec[0] = viewport.x + (1 + vec[0]) * 0.5 * viewport.width;
  vec[1] = viewport.y + (1 - vec[1]) * 0.5 * viewport.height;
  vec[2] = viewport.minZ + vec[2] * (viewport.maxZ - viewport.minZ);
  return vec;
}

export { _TriViewport as TriViewport, Vec3TransformByViewport };
//# sourceMappingURL=TriViewport.js.map
