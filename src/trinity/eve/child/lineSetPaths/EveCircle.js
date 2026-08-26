// Source: trinity/trinity/Eve/SpaceObject/Children/LineSetPaths/EveCircle.h
// Source: trinity/trinity/Eve/SpaceObject/Children/LineSetPaths/EveCircle.cpp
// Source: trinity/trinity/Eve/SpaceObject/Children/LineSetPaths/EveCircle_Blue.cpp
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { sph3 } from "#math/sph3";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { carbon, impl, io, type } from "#schema";
import { IEveLineSetPath } from "./IEveLineSetPath.js";


/**
 * Line-set path shaped as a ring: samples a circle of circleRadius, optionally
 * distorted per quadrant, and emits the resulting chain as line segments.
 */
@type.define({
  className: "EveCircle",
  family: "eve/child/lineSetPaths"
})
export class EveCircle extends IEveLineSetPath
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
  @type.float32
  circleRadius = 100;

  @io.notify
  @io.persist
  @type.vec4
  circleDistort = vec4.fromValues(1, 0, 1, 0);

  @io.notify
  @io.persist
  @type.float32
  numSegments = 64;

  @io.notify
  @io.persist
  @type.float32
  completeness = 1;

  @io.notify
  @io.persist
  @type.float32
  startPoint = 0;

  @io.notify
  @io.persist
  @type.float32
  lineWidth = 1;

  @io.notify
  @io.persist
  @type.boolean
  scaleSegmentsByCompleteness = false;

  @io.notify
  @io.persist
  @type.boolean
  scaleEndpoints = true;

  @io.notify
  @io.persist
  @type.boolean
  billboardObjects = false;

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
   * Clamps completeness to 0..2 and numSegments to 1..128, wraps startPoint into
   * one turn, then marks the point chain dirty.
   */
  @carbon.method
  @impl.adapted
  OnModified(_options = {})
  {
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
  @carbon.method
  @impl.adapted
  Update(updateContext, _params = null)
  {
    if (this.movementSpeed !== 0)
    {
      this.animValue = (this.animValue + this.movementSpeed * EveCircle.#getDeltaT(updateContext)) % 1;
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
   * Samples the ring into the point chain across the arc selected by completeness and startPoint, rotated by the animation value, with circleDistort applied as a per-quadrant Y offset; also refreshes the world transform. Does nothing when fewer than two segments are requested.
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
    if (!mat4.exactEquals(parentTransform, EveCircle.#identityMatrix))
    {
      this.UpdateTransform(parentTransform);
      mat4.copy(this.#parentTransform, parentTransform);
    }
    else
    {
      this.UpdateTransform(this.#parentTransform);
    }
    const totalArc = (1 - Math.abs(this.completeness - 1)) * Math.PI * 2;
    const startOffset = this.startPoint * Math.PI * 2 + Math.max(this.completeness - 1, 0) * Math.PI * 2 + totalArc / (2 * segmentCount);
    const points = [];
    for (let i = 0; i < segmentCount; i++)
    {
      const location = startOffset + totalArc * (i / segmentCount + this.animValue / segmentCount);
      const sin = Math.sin(location);
      const cos = Math.cos(location);
      let y = 0;
      if (this.circleDistort[1] !== 0 || this.circleDistort[3] !== 0)
      {
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
  @carbon.method
  @impl.adapted
  GetPointCount()
  {
    return this.#points.length;
  }

  /**
   * Sets the local bounding sphere to the origin with radius circleRadius + lineWidth + meshSize.
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
    vec4.set(this.#boundingSphere, 0, 0, 0, this.circleRadius + this.lineWidth + meshSize);
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
    this.isVisible = !!frustum.IsSphereVisible(sphere);
  }

  /**
   * Emits one straight line per segment into the line set (regenerating dirty
   * points first), optionally animated at scrollSpeed; the wrap-around segment
   * closing the ring is skipped unless completeness is exactly 1.
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
      if (this.completeness !== 1 && next === 0)
      {
        continue;
      }
      const start = EveCircle.#transformPoint(this.#points[i], this.localTransform);
      const end = EveCircle.#transformPoint(this.#points[next], this.localTransform);
      const id = lineSet.AddStraightLine(start, color, end, color, this.lineWidth);
      if (scrollSpeed !== 0)
      {
        lineSet.ChangeLineAnimation(id, animColor, scrollSpeed, 1);
      }
    }
  }

  /** Carbon declares no circle-specific debug options (cpp:269-271). */
  @carbon.method
  @impl.noop
  GetDebugOptions(_options)
  {
  }

  /**
   * Rounded segment count, scaled down by how far completeness is from a full
   * sweep when scaleSegmentsByCompleteness is set.
   */
  #getSegmentCount()
  {
    const completenessScale = 1 - Math.abs(this.completeness - 1);
    return Math.trunc(this.scaleSegmentsByCompleteness ? (this.numSegments + 0.5) * completenessScale : this.numSegments + 0.5);
  }

  static #identityMatrix = mat4.create();

  /**
   * Finite frame delta read from the required update-context contract.
   */
  static #getDeltaT(context)
  {
    const value = context.GetDeltaT();
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
