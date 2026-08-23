// Source: trinity/trinity/Eve/SpaceObject/Children/LineSetPaths/EveBezierCurve.h
// Source: trinity/trinity/Eve/SpaceObject/Children/LineSetPaths/EveBezierCurve.cpp
// Source: trinity/trinity/Eve/SpaceObject/Children/LineSetPaths/EveBezierCurve_Blue.cpp
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { sph3 } from "#math/sph3";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { CjsModel } from "#model";
import { carbon, impl, io, type } from "#schema";
import { EveChildTransform } from "../EveChildTransform.js";


/**
 * Line-set path shaped as a quadratic Bezier: samples the curve between two
 * endpoints through one control point and emits the resulting chain as line
 * segments.
 */
@type.define({
  className: "EveBezierCurve",
  family: "eve/child/lineSetPaths"
})
export class EveBezierCurve extends EveChildTransform
{
  @io.persist
  @type.string
  name = "";

  @io.persist
  @type.boolean
  display = true;

  @io.notify
  @io.persist
  @type.vec3
  translation = vec3.create();

  @io.notify
  @io.persist
  @type.quat
  rotation = quat.create();

  @io.notify
  @io.persist
  @type.vec3
  scaling = vec3.fromValues(1, 1, 1);

  @io.read
  @type.boolean
  isVisible = true;

  @io.notify
  @io.persist
  @type.vec3
  point1 = vec3.create();

  @io.notify
  @io.persist
  @type.vec3
  point2 = vec3.create();

  @io.notify
  @io.persist
  @type.vec3
  bezierPoint = vec3.create();

  @io.notify
  @io.persist
  @type.float32
  completeness = 1;

  @io.notify
  @io.persist
  @type.float32
  segments = 24;

  @io.notify
  @io.persist
  @type.float32
  segmentOffset = 0;

  @io.notify
  @io.persist
  @type.float32
  lineWidth = 1;

  @io.notify
  @io.persist
  @type.boolean
  scaleSegmentsByCompleteness = true;

  @io.notify
  @io.persist
  @type.boolean
  scaleEndpoints = true;

  @io.notify
  @io.persist
  @type.boolean
  billboardObjects = true;

  @io.persist
  @type.vec3
  objectScale = vec3.fromValues(1, 1, 1);

  @io.persist
  @type.float32
  movementSpeed = 0;

  @io.read
  @type.float32
  animValue = 0;

  #points = [];

  #parentTransform = mat4.create();

  #boundingSphere = vec4.create();

  #meshSize = 0;

  #regeneratePoints = true;

  /** Marks the point chain dirty so the first update regenerates it. */
  @carbon.method
  @impl.implemented
  Initialize()
  {
    this.#regeneratePoints = true;
    return true;
  }

  /**
   * Clamps completeness to 0..2, segments to 1..128 and segmentOffset to 0..1,
   * then marks the point chain dirty.
   */
  @carbon.method
  @impl.adapted
  OnModified(_options = {})
  {
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
  @carbon.method
  @impl.adapted
  Update(updateContext, _params = null)
  {
    if (this.movementSpeed !== 0)
    {
      this.animValue = (this.animValue + this.movementSpeed * EveBezierCurve.#getDeltaT(updateContext)) % 1;
    }
    if (!this.#regeneratePoints)
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
  @carbon.method
  @impl.adapted
  GeneratePoints(parentTransform = mat4.create())
  {
    const segmentCount = this.#getSegmentCount();
    if (segmentCount <= 1)
    {
      return;
    }
    if (!mat4.exactEquals(parentTransform, EveBezierCurve.#identityMatrix))
    {
      this.UpdateTransform(parentTransform);
      mat4.copy(this.#parentTransform, parentTransform);
    }
    else
    {
      this.UpdateTransform(this.#parentTransform);
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
    this.#points = points;
    this.#regeneratePoints = false;
  }

  /** Number of generated points; zero until GeneratePoints has run. */
  @carbon.method
  @impl.adapted
  GetPointCount()
  {
    return this.#points.length;
  }

  /**
   * Recomputes the local bounding sphere around the three control points, padded by the mesh size of the billboard objects riding the path.
   * @param {Number} [meshSize] - a non-zero value is remembered and reused on later zero-argument calls
   */
  @carbon.method
  @impl.adapted
  CalculateBoundingSphere(meshSize = 0, _reCalculateChildren = true)
  {
    if (meshSize !== 0)
    {
      this.#meshSize = meshSize;
    }
    else if (this.#meshSize !== 0)
    {
      meshSize = this.#meshSize;
    }
    const center = vec3.scale(vec3.create(), vec3.add(vec3.create(), vec3.add(vec3.create(), this.point1, this.point2), this.bezierPoint), 1 / 3);
    const radiusSquared = Math.max(
      vec3.squaredDistance(this.point1, center),
      vec3.squaredDistance(this.point2, center),
      vec3.squaredDistance(this.bezierPoint, center)
    );
    vec4.set(this.#boundingSphere, center[0], center[1], center[2], Math.sqrt(radiusSquared) + meshSize);
  }

  /**
   * Returns the cached bounding sphere moved through the path's local transform.
   * @param {Float32Array} [out] - caller-owned; allocated when omitted
   * @returns {Float32Array} out
   */
  @carbon.method
  @impl.adapted
  GetBoundingSphere(out = vec4.create())
  {
    return sph3.transformMat4(out, this.#boundingSphere, this.localTransform);
  }

  /**
   * Tests the bounding sphere, placed by the local transform under the given
   * system location, against the frustum and stores the result in isVisible; a
   * non-displayed path returns early and keeps its previous flag.
   */
  @carbon.method
  @impl.adapted
  UpdateVisibility(frustum, _parentLod = null, systemLocation = mat4.create())
  {
    if (!this.display)
    {
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
  @carbon.method
  @impl.adapted
  AddLinesToSet(lineSet, color, animColor, scrollSpeed = 0)
  {
    if (!this.display || !this.isVisible)
    {
      return;
    }
    if (this.#regeneratePoints)
    {
      this.GeneratePoints();
      this.CalculateBoundingSphere();
    }
    const segmentCount = Math.min(this.#getSegmentCount(), this.#points.length);
    for (let i = 0; i < segmentCount; i++)
    {
      const next = (i + 1) % segmentCount;
      if (next === 0 && this.completeness < 1)
      {
        continue;
      }
      const start = EveBezierCurve.#transformPoint(this.#points[i], this.localTransform);
      const endPoint = next === 0 ? this.point2 : this.#points[next];
      const end = EveBezierCurve.#transformPoint(endPoint, this.localTransform);
      const id = lineSet.AddStraightLine(start, color, end, color, this.lineWidth);
      if (scrollSpeed !== 0)
      {
        lineSet.ChangeLineAnimation(id, animColor, scrollSpeed, 1);
      }
    }
  }

  /**
   * Rounded segment count, scaled down by how far completeness is from a full
   * sweep when scaleSegmentsByCompleteness is set.
   */
  #getSegmentCount()
  {
    const completenessScale = 1 - Math.abs(this.completeness - 1);
    return Math.trunc(this.scaleSegmentsByCompleteness ? (this.segments + 0.5) * completenessScale : this.segments + 0.5);
  }

  /** Carbon EveBezierCurve::UpdateBuffer (EveBezierCurve.cpp:207+,
   * pure-virtual on IEveLineSetPath.h:10): fills the billboard-object
   * instance buffer. The body carries real compositions (see the EveCircle
   * twin) - every one must swap operands per the carbon-math conventions
   * when this is ported. */
  @carbon.method
  @impl.notImplemented
  UpdateBuffer(..._args)
  {
    throw new Error("EveBezierCurve.UpdateBuffer is not implemented in CarbonEngineJS.");
  }

  static #identityMatrix = mat4.create();

  /**
   * Frame delta read from the update-context duck (GetDeltaT() or .deltaT),
   * falling back to 0 when neither is present or the value is not finite.
   */
  static #getDeltaT(context)
  {
    const value = context?.GetDeltaT?.() ?? context?.deltaT ?? 0;
    return Number.isFinite(Number(value)) ? Number(value) : 0;
  }

  /**
   * Returns a newly allocated vector holding the point moved through the given
   * transform.
   */
  static #transformPoint(point, transform)
  {
    return vec3.transformMat4(vec3.create(), point, transform);
  }
}
