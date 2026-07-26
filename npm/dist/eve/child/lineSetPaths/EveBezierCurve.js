import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { sph3 } from '@carbonenginejs/runtime-utils/sph3';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveChildTransform as _EveChildTransform } from '../EveChildTransform.js';

let _initProto, _initClass, _init_name, _init_extra_name, _init_display, _init_extra_display, _init_translation, _init_extra_translation, _init_rotation, _init_extra_rotation, _init_scaling, _init_extra_scaling, _init_isVisible, _init_extra_isVisible, _init_point, _init_extra_point, _init_point2, _init_extra_point2, _init_bezierPoint, _init_extra_bezierPoint, _init_completeness, _init_extra_completeness, _init_segments, _init_extra_segments, _init_segmentOffset, _init_extra_segmentOffset, _init_lineWidth, _init_extra_lineWidth, _init_scaleSegmentsByCompleteness, _init_extra_scaleSegmentsByCompleteness, _init_scaleEndpoints, _init_extra_scaleEndpoints, _init_billboardObjects, _init_extra_billboardObjects, _init_objectScale, _init_extra_objectScale, _init_movementSpeed, _init_extra_movementSpeed, _init_animValue, _init_extra_animValue;

/**
 * Line-set path shaped as a quadratic Bezier: samples the curve between two
 * endpoints through one control point and emits the resulting chain as line
 * segments.
 */
let _EveBezierCurve;
new class extends _identity {
  static [class EveBezierCurve extends _EveChildTransform {
    static {
      ({
        e: [_init_name, _init_extra_name, _init_display, _init_extra_display, _init_translation, _init_extra_translation, _init_rotation, _init_extra_rotation, _init_scaling, _init_extra_scaling, _init_isVisible, _init_extra_isVisible, _init_point, _init_extra_point, _init_point2, _init_extra_point2, _init_bezierPoint, _init_extra_bezierPoint, _init_completeness, _init_extra_completeness, _init_segments, _init_extra_segments, _init_segmentOffset, _init_extra_segmentOffset, _init_lineWidth, _init_extra_lineWidth, _init_scaleSegmentsByCompleteness, _init_extra_scaleSegmentsByCompleteness, _init_scaleEndpoints, _init_extra_scaleEndpoints, _init_billboardObjects, _init_extra_billboardObjects, _init_objectScale, _init_extra_objectScale, _init_movementSpeed, _init_extra_movementSpeed, _init_animValue, _init_extra_animValue, _initProto],
        c: [_EveBezierCurve, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveBezierCurve",
        family: "eve/child/lineSetPaths"
      })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.boolean], 16, "display"], [[io, io.notify, io, io.persist, type, type.vec3], 16, "translation"], [[io, io.notify, io, io.persist, type, type.quat], 16, "rotation"], [[io, io.notify, io, io.persist, type, type.vec3], 16, "scaling"], [[io, io.read, type, type.boolean], 16, "isVisible"], [[io, io.notify, io, io.persist, type, type.vec3], 16, "point1"], [[io, io.notify, io, io.persist, type, type.vec3], 16, "point2"], [[io, io.notify, io, io.persist, type, type.vec3], 16, "bezierPoint"], [[io, io.notify, io, io.persist, type, type.float32], 16, "completeness"], [[io, io.notify, io, io.persist, type, type.float32], 16, "segments"], [[io, io.notify, io, io.persist, type, type.float32], 16, "segmentOffset"], [[io, io.notify, io, io.persist, type, type.float32], 16, "lineWidth"], [[io, io.notify, io, io.persist, type, type.boolean], 16, "scaleSegmentsByCompleteness"], [[io, io.notify, io, io.persist, type, type.boolean], 16, "scaleEndpoints"], [[io, io.notify, io, io.persist, type, type.boolean], 16, "billboardObjects"], [[io, io.persist, type, type.vec3], 16, "objectScale"], [[io, io.persist, type, type.float32], 16, "movementSpeed"], [[io, io.read, type, type.float32], 16, "animValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted], 18, "OnModified"], [[carbon, carbon.method, impl, impl.adapted], 18, "Update"], [[carbon, carbon.method, impl, impl.adapted], 18, "GeneratePoints"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetPointCount"], [[carbon, carbon.method, impl, impl.adapted], 18, "CalculateBoundingSphere"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetBoundingSphere"], [[carbon, carbon.method, impl, impl.adapted], 18, "UpdateVisibility"], [[carbon, carbon.method, impl, impl.adapted], 18, "AddLinesToSet"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "UpdateBuffer"]], 0, void 0, _EveChildTransform));
    }
    name = (_initProto(this), _init_name(this, ""));
    display = (_init_extra_name(this), _init_display(this, true));
    translation = (_init_extra_display(this), _init_translation(this, vec3.create()));
    rotation = (_init_extra_translation(this), _init_rotation(this, quat.create()));
    scaling = (_init_extra_rotation(this), _init_scaling(this, vec3.fromValues(1, 1, 1)));
    isVisible = (_init_extra_scaling(this), _init_isVisible(this, true));
    point1 = (_init_extra_isVisible(this), _init_point(this, vec3.create()));
    point2 = (_init_extra_point(this), _init_point2(this, vec3.create()));
    bezierPoint = (_init_extra_point2(this), _init_bezierPoint(this, vec3.create()));
    completeness = (_init_extra_bezierPoint(this), _init_completeness(this, 1));
    segments = (_init_extra_completeness(this), _init_segments(this, 24));
    segmentOffset = (_init_extra_segments(this), _init_segmentOffset(this, 0));
    lineWidth = (_init_extra_segmentOffset(this), _init_lineWidth(this, 1));
    scaleSegmentsByCompleteness = (_init_extra_lineWidth(this), _init_scaleSegmentsByCompleteness(this, true));
    scaleEndpoints = (_init_extra_scaleSegmentsByCompleteness(this), _init_scaleEndpoints(this, true));
    billboardObjects = (_init_extra_scaleEndpoints(this), _init_billboardObjects(this, true));
    objectScale = (_init_extra_billboardObjects(this), _init_objectScale(this, vec3.fromValues(1, 1, 1)));
    movementSpeed = (_init_extra_objectScale(this), _init_movementSpeed(this, 0));
    animValue = (_init_extra_movementSpeed(this), _init_animValue(this, 0));
    #points = (_init_extra_animValue(this), []);
    #parentTransform = mat4.create();
    #boundingSphere = vec4.create();
    #meshSize = 0;
    #regeneratePoints = true;

    /** Marks the point chain dirty so the first update regenerates it. */
    Initialize() {
      this.#regeneratePoints = true;
      return true;
    }

    /**
     * Clamps completeness to 0..2, segments to 1..128 and segmentOffset to 0..1,
     * then marks the point chain dirty.
     */
    OnModified(_options = {}) {
      this.completeness = Math.min(2, Math.max(0, this.completeness));
      this.segments = Math.min(128, Math.max(1, this.segments));
      this.segmentOffset = Math.min(1, Math.max(0, this.segmentOffset));
      this.#regeneratePoints = true;
      return true;
    }

    /**
     * Advances the scroll animation value by movementSpeed times the frame delta
     * (wrapped into 0..1) and, when the points are dirty, regenerates them and the
     * bounding sphere; returns whether a regeneration ran.
     */
    Update(updateContext, _params = null) {
      if (this.movementSpeed !== 0) {
        this.animValue = (this.animValue + this.movementSpeed * _EveBezierCurve.#getDeltaT(updateContext)) % 1;
      }
      if (!this.#regeneratePoints) {
        return false;
      }
      this.GeneratePoints();
      this.CalculateBoundingSphere();
      return true;
    }

    /**
     * Samples the quadratic Bezier into the point chain across the sub-range selected by completeness, shifted by segmentOffset, and refreshes the world transform. Does nothing when fewer than two segments are requested.
     * @param {Float32Array} [parentTransform] - a non-identity matrix is used and cached, so later identity calls reuse the last real parent transform
     */
    GeneratePoints(parentTransform = mat4.create()) {
      const segmentCount = this.#getSegmentCount();
      if (segmentCount <= 1) {
        return;
      }
      if (!mat4.exactEquals(parentTransform, _EveBezierCurve.#identityMatrix)) {
        this.UpdateTransform(parentTransform);
        mat4.copy(this.#parentTransform, parentTransform);
      } else {
        this.UpdateTransform(this.#parentTransform);
      }
      const lower = Math.min(this.completeness, 1);
      const upper = Math.max(0, this.completeness - 1);
      const points = [];
      for (let i = 0; i < segmentCount; i++) {
        const sourceT = i / segmentCount + this.segmentOffset / segmentCount;
        const t = sourceT * (lower - upper) + upper;
        const inverse = 1 - t;
        const a = inverse * inverse;
        const b = 2 * inverse * t;
        const c = t * t;
        points.push(vec3.fromValues(a * this.point1[0] + b * this.bezierPoint[0] + c * this.point2[0], a * this.point1[1] + b * this.bezierPoint[1] + c * this.point2[1], a * this.point1[2] + b * this.bezierPoint[2] + c * this.point2[2]));
      }
      this.#points = points;
      this.#regeneratePoints = false;
    }

    /** Number of generated points; zero until GeneratePoints has run. */
    GetPointCount() {
      return this.#points.length;
    }

    /**
     * Recomputes the local bounding sphere around the three control points, padded by the mesh size of the billboard objects riding the path.
     * @param {Number} [meshSize] - a non-zero value is remembered and reused on later zero-argument calls
     */
    CalculateBoundingSphere(meshSize = 0, _reCalculateChildren = true) {
      if (meshSize !== 0) {
        this.#meshSize = meshSize;
      } else if (this.#meshSize !== 0) {
        meshSize = this.#meshSize;
      }
      const center = vec3.scale(vec3.create(), vec3.add(vec3.create(), vec3.add(vec3.create(), this.point1, this.point2), this.bezierPoint), 1 / 3);
      const radiusSquared = Math.max(vec3.squaredDistance(this.point1, center), vec3.squaredDistance(this.point2, center), vec3.squaredDistance(this.bezierPoint, center));
      vec4.set(this.#boundingSphere, center[0], center[1], center[2], Math.sqrt(radiusSquared) + meshSize);
    }

    /**
     * Returns the cached bounding sphere moved through the path's local transform.
     * @param {Float32Array} [out] - caller-owned; allocated when omitted
     * @returns {Float32Array} out
     */
    GetBoundingSphere(out = vec4.create()) {
      return sph3.transformMat4(out, this.#boundingSphere, this.localTransform);
    }

    /**
     * Tests the bounding sphere, placed by the local transform under the given
     * system location, against the frustum and stores the result in isVisible; a
     * non-displayed path returns early and keeps its previous flag.
     */
    UpdateVisibility(frustum, _parentLod = null, systemLocation = mat4.create()) {
      if (!this.display) {
        return;
      }
      this.isVisible = false;
      // Carbon (row-vector): m_localTransform * systemLocation - local first.
      const transform = mat4.multiply(mat4.create(), systemLocation, this.localTransform);
      const sphere = sph3.transformMat4(vec4.create(), this.#boundingSphere, transform);
      this.isVisible = !!frustum?.IsSphereVisible?.(sphere);
    }

    /**
     * Emits one straight line per segment into the line set (regenerating dirty
     * points first), optionally animated at scrollSpeed; the wrap-around segment
     * is skipped while completeness is below 1, and the last segment ends exactly
     * on point2 rather than on an interpolated sample.
     */
    AddLinesToSet(lineSet, color, animColor, scrollSpeed = 0) {
      if (!this.display || !this.isVisible) {
        return;
      }
      if (this.#regeneratePoints) {
        this.GeneratePoints();
        this.CalculateBoundingSphere();
      }
      const segmentCount = Math.min(this.#getSegmentCount(), this.#points.length);
      for (let i = 0; i < segmentCount; i++) {
        const next = (i + 1) % segmentCount;
        if (next === 0 && this.completeness < 1) {
          continue;
        }
        const start = _EveBezierCurve.#transformPoint(this.#points[i], this.localTransform);
        const endPoint = next === 0 ? this.point2 : this.#points[next];
        const end = _EveBezierCurve.#transformPoint(endPoint, this.localTransform);
        const id = lineSet.AddStraightLine(start, color, end, color, this.lineWidth);
        if (scrollSpeed !== 0) {
          lineSet.ChangeLineAnimation(id, animColor, scrollSpeed, 1);
        }
      }
    }

    /**
     * Rounded segment count, scaled down by how far completeness is from a full
     * sweep when scaleSegmentsByCompleteness is set.
     */
    #getSegmentCount() {
      const completenessScale = 1 - Math.abs(this.completeness - 1);
      return Math.trunc(this.scaleSegmentsByCompleteness ? (this.segments + 0.5) * completenessScale : this.segments + 0.5);
    }

    /** Carbon EveBezierCurve::UpdateBuffer (EveBezierCurve.cpp:207+,
     * pure-virtual on IEveLineSetPath.h:10): fills the billboard-object
     * instance buffer. The body carries real compositions (see the EveCircle
     * twin) - every one must swap operands per the carbon-math conventions
     * when this is ported. */
    UpdateBuffer(..._args) {
      throw new Error("EveBezierCurve.UpdateBuffer is not implemented in CarbonEngineJS.");
    }

    /**
     * Frame delta read from the update-context duck (GetDeltaT() or .deltaT),
     * falling back to 0 when neither is present or the value is not finite.
     */

    /**
     * Returns a newly allocated vector holding the point moved through the given
     * transform.
     */
  }];
  #identityMatrix = mat4.create();
  #getDeltaT(context) {
    const value = context?.GetDeltaT?.() ?? context?.deltaT ?? 0;
    return Number.isFinite(Number(value)) ? Number(value) : 0;
  }
  #transformPoint(point, transform) {
    return vec3.transformMat4(vec3.create(), point, transform);
  }
  constructor() {
    super(_EveBezierCurve), _initClass();
  }
}();

export { _EveBezierCurve as EveBezierCurve };
//# sourceMappingURL=EveBezierCurve.js.map
