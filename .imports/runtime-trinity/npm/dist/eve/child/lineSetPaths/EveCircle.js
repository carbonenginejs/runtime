import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { sph3 } from '@carbonenginejs/runtime-utils/sph3';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveChildTransform as _EveChildTransform } from '../EveChildTransform.js';

let _initProto, _initClass, _init_name, _init_extra_name, _init_display, _init_extra_display, _init_translation, _init_extra_translation, _init_rotation, _init_extra_rotation, _init_scaling, _init_extra_scaling, _init_isVisible, _init_extra_isVisible, _init_circleRadius, _init_extra_circleRadius, _init_circleDistort, _init_extra_circleDistort, _init_numSegments, _init_extra_numSegments, _init_completeness, _init_extra_completeness, _init_startPoint, _init_extra_startPoint, _init_lineWidth, _init_extra_lineWidth, _init_scaleSegmentsByCompleteness, _init_extra_scaleSegmentsByCompleteness, _init_scaleEndpoints, _init_extra_scaleEndpoints, _init_billboardObjects, _init_extra_billboardObjects, _init_objectScale, _init_extra_objectScale, _init_movementSpeed, _init_extra_movementSpeed, _init_animValue, _init_extra_animValue;

/**
 * Line-set path shaped as a ring: samples a circle of circleRadius, optionally
 * distorted per quadrant, and emits the resulting chain as line segments.
 */
let _EveCircle;
new class extends _identity {
  static [class EveCircle extends _EveChildTransform {
    static {
      ({
        e: [_init_name, _init_extra_name, _init_display, _init_extra_display, _init_translation, _init_extra_translation, _init_rotation, _init_extra_rotation, _init_scaling, _init_extra_scaling, _init_isVisible, _init_extra_isVisible, _init_circleRadius, _init_extra_circleRadius, _init_circleDistort, _init_extra_circleDistort, _init_numSegments, _init_extra_numSegments, _init_completeness, _init_extra_completeness, _init_startPoint, _init_extra_startPoint, _init_lineWidth, _init_extra_lineWidth, _init_scaleSegmentsByCompleteness, _init_extra_scaleSegmentsByCompleteness, _init_scaleEndpoints, _init_extra_scaleEndpoints, _init_billboardObjects, _init_extra_billboardObjects, _init_objectScale, _init_extra_objectScale, _init_movementSpeed, _init_extra_movementSpeed, _init_animValue, _init_extra_animValue, _initProto],
        c: [_EveCircle, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveCircle",
        family: "eve/child/lineSetPaths"
      })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.boolean], 16, "display"], [[io, io.notify, io, io.persist, type, type.vec3], 16, "translation"], [[io, io.notify, io, io.persist, type, type.quat], 16, "rotation"], [[io, io.notify, io, io.persist, type, type.vec3], 16, "scaling"], [[io, io.read, type, type.boolean], 16, "isVisible"], [[io, io.notify, io, io.persist, type, type.float32], 16, "circleRadius"], [[io, io.notify, io, io.persist, type, type.vec4], 16, "circleDistort"], [[io, io.notify, io, io.persist, type, type.float32], 16, "numSegments"], [[io, io.notify, io, io.persist, type, type.float32], 16, "completeness"], [[io, io.notify, io, io.persist, type, type.float32], 16, "startPoint"], [[io, io.notify, io, io.persist, type, type.float32], 16, "lineWidth"], [[io, io.notify, io, io.persist, type, type.boolean], 16, "scaleSegmentsByCompleteness"], [[io, io.notify, io, io.persist, type, type.boolean], 16, "scaleEndpoints"], [[io, io.notify, io, io.persist, type, type.boolean], 16, "billboardObjects"], [[io, io.persist, type, type.vec3], 16, "objectScale"], [[io, io.persist, type, type.float32], 16, "movementSpeed"], [[io, io.read, type, type.float32], 16, "animValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted], 18, "OnModified"], [[carbon, carbon.method, impl, impl.adapted], 18, "Update"], [[carbon, carbon.method, impl, impl.adapted], 18, "GeneratePoints"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetPointCount"], [[carbon, carbon.method, impl, impl.adapted], 18, "CalculateBoundingSphere"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetBoundingSphere"], [[carbon, carbon.method, impl, impl.adapted], 18, "UpdateVisibility"], [[carbon, carbon.method, impl, impl.adapted], 18, "AddLinesToSet"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "UpdateBuffer"]], 0, void 0, _EveChildTransform));
    }
    name = (_initProto(this), _init_name(this, ""));
    display = (_init_extra_name(this), _init_display(this, true));
    translation = (_init_extra_display(this), _init_translation(this, vec3.create()));
    rotation = (_init_extra_translation(this), _init_rotation(this, quat.create()));
    scaling = (_init_extra_rotation(this), _init_scaling(this, vec3.fromValues(1, 1, 1)));
    isVisible = (_init_extra_scaling(this), _init_isVisible(this, true));
    circleRadius = (_init_extra_isVisible(this), _init_circleRadius(this, 100));
    circleDistort = (_init_extra_circleRadius(this), _init_circleDistort(this, vec4.fromValues(1, 0, 1, 0)));
    numSegments = (_init_extra_circleDistort(this), _init_numSegments(this, 64));
    completeness = (_init_extra_numSegments(this), _init_completeness(this, 1));
    startPoint = (_init_extra_completeness(this), _init_startPoint(this, 0));
    lineWidth = (_init_extra_startPoint(this), _init_lineWidth(this, 1));
    scaleSegmentsByCompleteness = (_init_extra_lineWidth(this), _init_scaleSegmentsByCompleteness(this, false));
    scaleEndpoints = (_init_extra_scaleSegmentsByCompleteness(this), _init_scaleEndpoints(this, true));
    billboardObjects = (_init_extra_scaleEndpoints(this), _init_billboardObjects(this, false));
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
     * Clamps completeness to 0..2 and numSegments to 1..128, wraps startPoint into
     * one turn, then marks the point chain dirty.
     */
    OnModified(_options = {}) {
      this.completeness = Math.min(2, Math.max(0, this.completeness));
      this.numSegments = Math.min(128, Math.max(1, this.numSegments));
      this.startPoint %= 1;
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
        this.animValue = (this.animValue + this.movementSpeed * _EveCircle.#getDeltaT(updateContext)) % 1;
      }
      if (!this.#regeneratePoints) {
        return false;
      }
      this.GeneratePoints();
      this.CalculateBoundingSphere();
      return true;
    }

    /**
     * Samples the ring into the point chain across the arc selected by completeness and startPoint, rotated by the animation value, with circleDistort applied as a per-quadrant Y offset; also refreshes the world transform. Does nothing when fewer than two segments are requested.
     * @param {Float32Array} [parentTransform] - a non-identity matrix is used and cached, so later identity calls reuse the last real parent transform
     */
    GeneratePoints(parentTransform = mat4.create()) {
      const segmentCount = this.#getSegmentCount();
      if (segmentCount <= 1) {
        return;
      }
      if (!mat4.exactEquals(parentTransform, _EveCircle.#identityMatrix)) {
        this.UpdateTransform(parentTransform);
        mat4.copy(this.#parentTransform, parentTransform);
      } else {
        this.UpdateTransform(this.#parentTransform);
      }
      const totalArc = (1 - Math.abs(this.completeness - 1)) * Math.PI * 2;
      const startOffset = this.startPoint * Math.PI * 2 + Math.max(this.completeness - 1, 0) * Math.PI * 2 + totalArc / (2 * segmentCount);
      const points = [];
      for (let i = 0; i < segmentCount; i++) {
        const location = startOffset + totalArc * (i / segmentCount + this.animValue / segmentCount);
        const sin = Math.sin(location);
        const cos = Math.cos(location);
        let y = 0;
        if (this.circleDistort[1] !== 0 || this.circleDistort[3] !== 0) {
          const distort1 = sin < 0 ? this.circleDistort[0] : this.circleDistort[2];
          const distort2 = cos < 0 ? this.circleDistort[3] : this.circleDistort[1];
          y = sin * sin * this.circleRadius * distort1 + cos * cos * this.circleRadius * distort2;
        }
        points.push(vec3.fromValues(cos * this.circleRadius, y, sin * this.circleRadius));
      }
      this.#points = points;
      this.#regeneratePoints = false;
    }

    /** Number of generated points; zero until GeneratePoints has run. */
    GetPointCount() {
      return this.#points.length;
    }

    /**
     * Sets the local bounding sphere to the origin with radius circleRadius + lineWidth + meshSize.
     * @param {Number} [meshSize] - a non-zero value is remembered and reused on later zero-argument calls
     */
    CalculateBoundingSphere(meshSize = 0, _reCalculateChildren = true) {
      if (meshSize !== 0) {
        this.#meshSize = meshSize;
      } else if (this.#meshSize !== 0) {
        meshSize = this.#meshSize;
      }
      vec4.set(this.#boundingSphere, 0, 0, 0, this.circleRadius + this.lineWidth + meshSize);
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
     * closing the ring is skipped unless completeness is exactly 1.
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
        if (this.completeness !== 1 && next === 0) {
          continue;
        }
        const start = _EveCircle.#transformPoint(this.#points[i], this.localTransform);
        const end = _EveCircle.#transformPoint(this.#points[next], this.localTransform);
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
      return Math.trunc(this.scaleSegmentsByCompleteness ? (this.numSegments + 0.5) * completenessScale : this.numSegments + 0.5);
    }

    /** Carbon EveCircle::UpdateBuffer (EveCircle.cpp:209-266, pure-virtual on
     * IEveLineSetPath.h:10): fills the billboard-object instance buffer. The
     * body carries real compositions - TransformationMatrix(sizeMod *
     * objectScale, objRot, translation) * m_localTransform,
     * Decompose(m_localTransform * systemLocation), TransformCoord with an
     * inverse rotation, and a 12-float transposed pack - EVERY one of which
     * must swap operands per the carbon-math conventions when this is ported. */
    UpdateBuffer(..._args) {
      throw new Error("EveCircle.UpdateBuffer is not implemented in CarbonEngineJS.");
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
    super(_EveCircle), _initClass();
  }
}();

export { _EveCircle as EveCircle };
//# sourceMappingURL=EveCircle.js.map
