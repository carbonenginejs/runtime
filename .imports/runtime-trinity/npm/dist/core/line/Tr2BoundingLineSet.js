import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { Tr2LineSet as _Tr2LineSet } from './Tr2LineSet.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

let _initProto, _initClass, _init_maxBounds, _init_extra_maxBounds, _init_minBounds, _init_extra_minBounds;

/** A line set that draws an axis-aligned bounding box and its picking volume. */
let _Tr2BoundingLineSet;
class Tr2BoundingLineSet extends _Tr2LineSet {
  static {
    ({
      e: [_init_maxBounds, _init_extra_maxBounds, _init_minBounds, _init_extra_minBounds, _initProto],
      c: [_Tr2BoundingLineSet, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2BoundingLineSet",
      family: "trinityCore"
    })], [[[io, io.notify, io, io.persist, type, type.vec3], 16, "maxBounds"], [[io, io.notify, io, io.persist, type, type.vec3], 16, "minBounds"], [[carbon, carbon.method, impl, impl.adapted], 18, "UpdateBounds"]], 0, void 0, _Tr2LineSet));
  }
  constructor(...args) {
    super(...args);
    _init_extra_minBounds(this);
  }
  /** m_maxBounds (Vector3) [READWRITE, NOTIFY, PERSIST] */
  maxBounds = (_initProto(this), _init_maxBounds(this, vec3.create()));

  /** m_minBounds (Vector3) [READWRITE, NOTIFY, PERSIST] */
  minBounds = (_init_extra_maxBounds(this), _init_minBounds(this, vec3.create()));

  /** Carbon method UpdateBounds (MAP_METHOD_AND_WRAP). */
  UpdateBounds(min, max) {
    vec3.copy(this.minBounds, min);
    vec3.copy(this.maxBounds, max);
    this.ClearLines();
    this.ClearPickingTriangles();
    this.#AddBox(this.minBounds, this.maxBounds, this.color);
    this.#AddPickingBox(this.minBounds, this.maxBounds);
    return this.SubmitChanges();
  }

  /**
   * Appends the twelve edges of an axis-aligned box.
   */
  #AddBox(min, max, color) {
    const minA = vec3.fromValues(max[0], min[1], min[2]);
    const minB = vec3.fromValues(min[0], max[1], min[2]);
    const minC = vec3.fromValues(max[0], max[1], min[2]);
    const maxA = vec3.fromValues(max[0], min[1], max[2]);
    const maxB = vec3.fromValues(min[0], max[1], max[2]);
    const maxC = vec3.fromValues(min[0], min[1], max[2]);
    for (const [from, to] of [[min, minA], [min, minB], [minC, minB], [minA, minC], [max, maxA], [max, maxB], [maxC, maxB], [maxA, maxC], [min, maxC], [max, minC], [minB, maxB], [minA, maxA]]) {
      this.AddLine(from, color, to, color);
    }
  }

  /**
   * Appends the box's triangles so it can be picked as a solid volume.
   */
  #AddPickingBox(min, max) {
    const minA = vec3.fromValues(max[0], min[1], min[2]);
    const minB = vec3.fromValues(min[0], max[1], min[2]);
    const minC = vec3.fromValues(max[0], max[1], min[2]);
    const maxA = vec3.fromValues(max[0], min[1], max[2]);
    const maxB = vec3.fromValues(min[0], max[1], max[2]);
    const maxC = vec3.fromValues(min[0], min[1], max[2]);
    for (const [a, b, c] of [[maxA, max, maxB], [maxA, maxB, maxC], [maxC, maxB, min], [min, maxB, minB], [min, minB, minA], [minA, minB, minC], [minA, minC, max], [minA, max, maxA], [maxA, min, minA], [maxA, maxC, min], [max, minC, minB], [max, minB, maxB]]) {
      this.AddPickingTriangle(a, b, c);
    }
  }
  static {
    _initClass();
  }
}

export { _Tr2BoundingLineSet as Tr2BoundingLineSet };
//# sourceMappingURL=Tr2BoundingLineSet.js.map
