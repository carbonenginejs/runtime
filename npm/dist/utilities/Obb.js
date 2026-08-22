import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { carbon, impl, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { PlaneDotCoord, PlaneDotNormal } from '../core/view/TriFrustum.js';

let _initProto, _initClass, _init_x, _init_extra_x, _init_y, _init_extra_y, _init_z, _init_extra_z, _init_center, _init_extra_center, _init_sizes, _init_extra_sizes;
const LARGE_MOVEMENT = 9e29;
const SIDE_POINTS = [[0, 2, 4, 6], [1, 3, 5, 7], [0, 1, 4, 5], [2, 3, 6, 7], [0, 1, 3, 4], [4, 5, 6, 7]];
const POINT_SIGNS = [[1, 1, 1], [-1, 1, 1], [1, -1, 1], [-1, -1, 1], [1, 1, -1], [-1, 1, -1], [1, -1, -1], [-1, -1, -1]];

/** A portable oriented bounding box with Carbon-compatible clipping helpers. */
let _Obb;
class Obb extends CjsModel {
  static {
    ({
      e: [_init_x, _init_extra_x, _init_y, _init_extra_y, _init_z, _init_extra_z, _init_center, _init_extra_center, _init_sizes, _init_extra_sizes, _initProto],
      c: [_Obb, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Obb",
      family: "utilities"
    })], [[[carbon, carbon.method, impl, impl.implemented], 18, "CreateClippedWorldBoundingObb"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon asserts the 0..7 range; JavaScript reports the same contract with RangeError.")], 18, "GetPoint"], [[carbon, carbon.method, impl, impl.implemented], 18, "ComputeAABB"], [[type, type.vec3], 16, "x"], [[type, type.vec3], 16, "y"], [[type, type.vec3], 16, "z"], [[type, type.vec3], 16, "center"], [[type, type.vec3], 16, "sizes"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_sizes(this);
  }
  /** Builds the world-space box and optionally shrinks it against six frustum planes. */
  CreateClippedWorldBoundingObb(localMin, localMax, localToWorld, frustum = null) {
    vec3.add(this.center, localMax, localMin);
    vec3.scale(this.center, this.center, 0.5);
    vec3.transformMat4(this.center, this.center, localToWorld);
    vec3.subtract(this.sizes, localMax, localMin);
    vec3.scale(this.sizes, this.sizes, 0.5);
    vec3.set(this.x, localToWorld[0], localToWorld[1], localToWorld[2]);
    vec3.set(this.y, localToWorld[4], localToWorld[5], localToWorld[6]);
    vec3.set(this.z, localToWorld[8], localToWorld[9], localToWorld[10]);
    if (!frustum) {
      return;
    }
    const point = vec3.create();
    const rayDirection = vec3.create();
    const axes = [this.x, this.y, this.z];
    for (let side = 0; side < 6; side++) {
      const axisIndex = Math.floor(side / 2);
      vec3.copy(rayDirection, axes[axisIndex]);
      if (side & 1) {
        vec3.negate(rayDirection, rayDirection);
      }
      let movement = LARGE_MOVEMENT;
      for (let frustumSide = 0; frustumSide < 6; frustumSide++) {
        const plane = frustum.planes[frustumSide];
        let planeMovement = LARGE_MOVEMENT;
        let pointInside = false;
        for (let index = 0; index < 4 && !pointInside; index++) {
          this.#WriteMaskedPoint(point, SIDE_POINTS[side][index]);
          const distance = PlaneDotCoord(plane, point);
          if (distance >= 0) {
            pointInside = true;
            continue;
          }
          const normalDistance = PlaneDotNormal(plane, rayDirection);
          if (normalDistance < 0.0001) {
            continue;
          }
          const amount = -distance / normalDistance;
          if (amount > 0) {
            planeMovement = Math.min(planeMovement, amount);
          }
        }
        if (!pointInside && planeMovement < LARGE_MOVEMENT) {
          movement = Math.min(movement, planeMovement);
        }
      }
      if (movement < LARGE_MOVEMENT) {
        movement *= 0.5;
        vec3.scaleAndAdd(this.center, this.center, rayDirection, movement);
        this.sizes[axisIndex] -= movement;
      }
    }
  }

  /** Returns one of Carbon's eight signed corner combinations. */
  GetPoint(index) {
    if (!Number.isInteger(index) || index < 0 || index > 7) {
      throw new RangeError("OBB point index must be an integer from 0 through 7");
    }
    return this.#WritePoint(vec3.create(), index);
  }

  /** Computes the axis-aligned bounds after applying one logical transform. */
  ComputeAABB(min, max, transform) {
    const point = vec3.create();
    const transformed = vec3.create();
    this.#WritePoint(point, 0);
    vec3.transformMat4(transformed, point, transform);
    vec3.copy(min, transformed);
    vec3.copy(max, transformed);
    for (let index = 1; index < 8; index++) {
      this.#WritePoint(point, index);
      vec3.transformMat4(transformed, point, transform);
      vec3.min(min, min, transformed);
      vec3.max(max, max, transformed);
    }
  }

  /** Writes one corner using Carbon's ordered point table. */
  #WritePoint(out, index) {
    const signs = POINT_SIGNS[index];
    vec3.copy(out, this.center);
    vec3.scaleAndAdd(out, out, this.x, signs[0] * this.sizes[0]);
    vec3.scaleAndAdd(out, out, this.y, signs[1] * this.sizes[1]);
    vec3.scaleAndAdd(out, out, this.z, signs[2] * this.sizes[2]);
    return out;
  }

  /** Writes one corner selected by an XYZ sign bit mask. */
  #WriteMaskedPoint(out, mask) {
    vec3.copy(out, this.center);
    vec3.scaleAndAdd(out, out, this.x, (mask & 1 ? 1 : -1) * this.sizes[0]);
    vec3.scaleAndAdd(out, out, this.y, (mask & 2 ? 1 : -1) * this.sizes[1]);
    vec3.scaleAndAdd(out, out, this.z, (mask & 4 ? 1 : -1) * this.sizes[2]);
    return out;
  }

  /** x (Vector3) */
  x = (_initProto(this), _init_x(this, vec3.create()));

  /** y (Vector3) */
  y = (_init_extra_x(this), _init_y(this, vec3.create()));

  /** z (Vector3) */
  z = (_init_extra_y(this), _init_z(this, vec3.create()));

  /** center (Vector3) */
  center = (_init_extra_z(this), _init_center(this, vec3.create()));

  /** sizes (Vector3) */
  sizes = (_init_extra_center(this), _init_sizes(this, vec3.create()));
  static {
    _initClass();
  }
}

export { _Obb as Obb };
//# sourceMappingURL=Obb.js.map
