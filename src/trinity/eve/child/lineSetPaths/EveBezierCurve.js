import { IInitialize } from "../../../../global/blue/IInitialize.js";
import { INotify } from "../../../../global/blue/INotify.js";
// Source: trinity/trinity/Eve/SpaceObject/Children/LineSetPaths/EveBezierCurve.h
// Source: trinity/trinity/Eve/SpaceObject/Children/LineSetPaths/EveBezierCurve.cpp
// Source: trinity/trinity/Eve/SpaceObject/Children/LineSetPaths/EveBezierCurve_Blue.cpp
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { sph3 } from "#math/sph3";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { meta } from "#schema";
import { IEveLineSetPath } from "./IEveLineSetPath.js";


/**
 * Line-set path shaped as a quadratic Bezier: samples the curve between two
 * endpoints through one control point and emits the resulting chain as line
 * segments.
 */
@meta.define({
  className: "EveBezierCurve",
  family: "eve/child/lineSetPaths"
})
@meta.blue.inherit(INotify, IInitialize)
export class EveBezierCurve extends IEveLineSetPath
{
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  display = true;

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  translation = vec3.create();

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.quat
  rotation = quat.create();

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  scaling = vec3.fromValues(1, 1, 1);

  @meta.blue.read
  @meta.type.boolean
  isVisible = true;

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  point1 = vec3.create();

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  point2 = vec3.create();

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  bezierPoint = vec3.create();

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  completeness = 1;

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  segments = 24;

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  segmentOffset = 0;

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  lineWidth = 1;

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  scaleSegmentsByCompleteness = true;

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  scaleEndpoints = true;

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  billboardObjects = true;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  objectScale = vec3.fromValues(1, 1, 1);

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  movementSpeed = 0;

  @meta.blue.read
  @meta.type.float32
  animValue = 0;

  _points = [];

  _parentTransform = mat4.create();

  _boundingSphere = vec4.create();

  _meshSize = 0;

  _regeneratePoints = true;

  /** Marks the point chain dirty so the first update regenerates it. */
  @meta.blue.method
  @meta.implemented
  Initialize()
  {
    this._regeneratePoints = true;
    return true;
  }

  /**
   * Clamps completeness to 0..2, segments to 1..128 and segmentOffset to 0..1,
   * then marks the point chain dirty.
   */
  @meta.blue.method
  @meta.adapted
  @meta.reason("JS dispatches the native hook using the exposed member name; existing class-owned rendering/resource adaptations remain unchanged.")
  OnModified(propertyName)
  {
    if (propertyName === "completeness") this.completeness = Math.min(2, Math.max(0, this.completeness));
    if (propertyName === "segments") this.segments = Math.min(128, Math.max(1, this.segments));
    if (propertyName === "segmentOffset") this.segmentOffset = Math.min(1, Math.max(0, this.segmentOffset));
    this._regeneratePoints = true;
    return true;
  }

  /**
   * Advances the scroll animation value by movementSpeed times the frame delta
   * (wrapped into 0..1) and, when the points are dirty, regenerates them and the
   * bounding sphere; returns whether a regeneration ran.
   */
  @meta.blue.method
  @meta.adapted
  Update(updateContext, _params = null)
  {
    if (this.movementSpeed !== 0)
    {
      this.animValue = (this.animValue + this.movementSpeed * EveBezierCurve._getDeltaT(updateContext)) % 1;
    }
    if (!this._regeneratePoints)
    {
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
  @meta.blue.method
  @meta.adapted
  GeneratePoints(parentTransform = mat4.create())
  {
    const segmentCount = this._getSegmentCount();
    if (segmentCount <= 1)
    {
      return;
    }
    if (!mat4.exactEquals(parentTransform, EveBezierCurve._identityMatrix))
    {
      this.UpdateTransform(parentTransform);
      mat4.copy(this._parentTransform, parentTransform);
    }
    else
    {
      this.UpdateTransform(this._parentTransform);
    }
    const lower = Math.min(this.completeness, 1);
    const upper = Math.max(0, this.completeness - 1);
    const points = [];
    for (let i = 0; i < segmentCount; i++)
    {
      const sourceT = i / segmentCount + this.segmentOffset / segmentCount;
      const t = sourceT * (lower - upper) + upper;
      const inverse = 1 - t;
      const a = inverse * inverse;
      const b = 2 * inverse * t;
      const c = t * t;
      points.push(vec3.fromValues(
        a * this.point1[0] + b * this.bezierPoint[0] + c * this.point2[0],
        a * this.point1[1] + b * this.bezierPoint[1] + c * this.point2[1],
        a * this.point1[2] + b * this.bezierPoint[2] + c * this.point2[2]
      ));
    }
    this._points = points;
    this._regeneratePoints = false;
  }

  /** Number of generated points; zero until GeneratePoints has run. */
  @meta.blue.method
  @meta.adapted
  GetPointCount()
  {
    return this._points.length;
  }

  /**
   * Recomputes the local bounding sphere around the three control points, padded by the mesh size of the billboard objects riding the path.
   * @param {Number} [meshSize] - a non-zero value is remembered and reused on later zero-argument calls
   */
  @meta.blue.method
  @meta.adapted
  CalculateBoundingSphere(meshSize = 0, _reCalculateChildren = true)
  {
    if (meshSize !== 0)
    {
      this._meshSize = meshSize;
    }
    else if (this._meshSize !== 0)
    {
      meshSize = this._meshSize;
    }
    const center = vec3.scale(vec3.create(), vec3.add(vec3.create(), vec3.add(vec3.create(), this.point1, this.point2), this.bezierPoint), 1 / 3);
    const radiusSquared = Math.max(
      vec3.squaredDistance(this.point1, center),
      vec3.squaredDistance(this.point2, center),
      vec3.squaredDistance(this.bezierPoint, center)
    );
    vec4.set(this._boundingSphere, center[0], center[1], center[2], Math.sqrt(radiusSquared) + meshSize);
  }

  /**
   * Returns the cached bounding sphere moved through the path's local transform.
   * @param {Float32Array} [out] - caller-owned; allocated when omitted
   * @returns {Float32Array} out
   */
  @meta.blue.method
  @meta.adapted
  GetBoundingSphere(out = vec4.create())
  {
    return sph3.transformMat4(out, this._boundingSphere, this.localTransform);
  }

  /**
   * Tests the bounding sphere, placed by the local transform under the given
   * system location, against the frustum and stores the result in isVisible; a
   * non-displayed path returns early and keeps its previous flag.
   */
  @meta.blue.method
  @meta.adapted
  UpdateVisibility(frustum, _parentLod = null, systemLocation = mat4.create())
  {
    if (!this.display)
    {
      return;
    }
    this.isVisible = false;
    // Carbon (row-vector): m_localTransform * systemLocation - local first.
    const transform = mat4.multiply(mat4.create(), systemLocation, this.localTransform);
    const sphere = sph3.transformMat4(vec4.create(), this._boundingSphere, transform);
    this.isVisible = !!frustum.IsSphereVisible(sphere);
  }

  /**
   * Emits one straight line per segment into the line set (regenerating dirty
   * points first), optionally animated at scrollSpeed; the wrap-around segment
   * is skipped while completeness is below 1, and the last segment ends exactly
   * on point2 rather than on an interpolated sample.
   */
  @meta.blue.method
  @meta.adapted
  AddLinesToSet(lineSet, color, animColor, scrollSpeed = 0)
  {
    if (!this.display || !this.isVisible)
    {
      return;
    }
    if (this._regeneratePoints)
    {
      this.GeneratePoints();
      this.CalculateBoundingSphere();
    }
    const segmentCount = Math.min(this._getSegmentCount(), this._points.length);
    for (let i = 0; i < segmentCount; i++)
    {
      const next = (i + 1) % segmentCount;
      if (next === 0 && this.completeness < 1)
      {
        continue;
      }
      const start = EveBezierCurve._transformPoint(this._points[i], this.localTransform);
      const endPoint = next === 0 ? this.point2 : this._points[next];
      const end = EveBezierCurve._transformPoint(endPoint, this.localTransform);
      const id = lineSet.AddStraightLine(start, color, end, color, this.lineWidth);
      if (scrollSpeed !== 0)
      {
        lineSet.ChangeLineAnimation(id, animColor, scrollSpeed, 1);
      }
    }
  }

  /** Carbon declares no Bezier-specific debug options (cpp:292-295). */
  @meta.blue.method
  @meta.noop
  GetDebugOptions(_options)
  {
  }

  /**
   * Rounded segment count, scaled down by how far completeness is from a full
   * sweep when scaleSegmentsByCompleteness is set.
   */
  _getSegmentCount()
  {
    const completenessScale = 1 - Math.abs(this.completeness - 1);
    return Math.trunc(this.scaleSegmentsByCompleteness ? (this.segments + 0.5) * completenessScale : this.segments + 0.5);
  }

  static _identityMatrix = mat4.create();

  /**
   * Finite frame delta read from the required update-context contract.
   */
  static _getDeltaT(context)
  {
    const value = context.GetDeltaT();
    return Number.isFinite(Number(value)) ? Number(value) : 0;
  }

  /**
   * Returns a newly allocated vector holding the point moved through the given
   * transform.
   */
  static _transformPoint(point, transform)
  {
    return vec3.transformMat4(vec3.create(), point, transform);
  }
}

// EveBezierCurve_Blue.cpp: native exposure.
meta.blue.interfaceTable({ interfaces: [EveBezierCurve, IEveLineSetPath, INotify], chainTo: null })(EveBezierCurve, { kind: "class" });
