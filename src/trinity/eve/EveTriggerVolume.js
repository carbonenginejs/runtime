// Source: trinity/trinity/Eve/EveTriggerVolume.h
// Source: trinity/trinity/Eve/EveTriggerVolume.cpp
// Source: trinity/trinity/Eve/EveTriggerVolume_Blue.cpp
import { mat4 } from "#math/mat4";
import { withIEveSpaceObject2 } from "./IEveSpaceObject2.js";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { CjsModel } from "#model";
import { carbon, impl, io, type } from "#schema";

const WORLD_CENTER_SCRATCH = vec3.create();
const TRACKED_POSITION_SCRATCH = vec3.create();
const OBJECT_POSITION_SCRATCH = vec3.create();
const INVERSE_WORLD_SCRATCH = mat4.create();
const CURVE_TRANSLATION_SCRATCH = vec3.create();
const CURVE_ROTATION_SCRATCH = quat.create();

// Carbon Sphere::IsPointInside epsilon (math Sphere_inline.h:107-116).
const SPHERE_RADIUS_EPSILON = 1e-4;


/**
 * A standalone spatial trigger that fires a script callback when a tracked
 * position enters or exits its volumes.
 *
 * Broad-phase bounding-sphere gate, intensity = max over volumes (early exit
 * at 1) minus max over exclusion volumes floored at 0, edge-triggered
 * callback on threshold crossings. No renderables, no async work - the whole
 * evaluation runs in UpdateSyncronous.
 */
@type.define({ className: "EveTriggerVolume", family: "eve" })
export class EveTriggerVolume extends withIEveSpaceObject2(CjsModel)
{

  /** Name identifier, passed to the callback so one handler can serve many trigger volumes. */
  @io.persist
  @type.string
  name = "";

  /** The volumes defining the trigger region. */
  @io.persist
  @type.list("IEveVolume")
  volumes = [];

  /** Volumes subtracted from the trigger region. */
  @io.persist
  @type.list("IEveVolume")
  exclusionVolumes = [];

  /** Volume intensity (0..1) at which the tracked position counts as inside. */
  @io.persist
  @type.float32
  enterThreshold = 0.5;

  /** External parameters exposing per-placement values, e.g. for dungeon asset manipulations. */
  @io.persist
  @type.list("Tr2ExternalParameter")
  externalParameters = [];

  /** m_ballPosition: vector function slot placing the trigger volume. */
  @io.persist
  @type.model("ITriVectorFunction")
  translationCurve = null;

  /** m_ballRotation: quaternion function slot rotating the trigger volume. */
  @io.persist
  @type.model("ITriQuaternionFunction")
  rotationCurve = null;

  /**
   * m_trackedPosition: vector function slot for the tracked position. Carbon
   * exposes it READWRITE but NOT PERSIST (EveTriggerVolume_Blue.cpp:58-62) -
   * destiny wires it at runtime, so it never serializes.
   */
  @type.model("ITriVectorFunction")
  trackedPositionCurve = null;

  /** Whether the tracked position is currently inside the trigger region. */
  @io.read
  @type.boolean
  isInside = false;

  /** m_currentIntensity: most recent evaluated volume intensity of the tracked position. */
  @io.read
  @type.float32
  intensity = 0;

  #worldTransform = mat4.create();

  // Carbon CcpMath::Sphere carries a radius<0 sentinel (Sphere_inline.h:9-13,
  // 33-36); the production port carries an explicit flag instead of
  // overloading the radius (2026-09-04 decision in the new-classes spec).
  #boundingSphereCenter = vec3.create();

  #boundingSphereRadius = 0;

  #boundingSphereInitialized = false;

  #callback = null;

  /**
   * Sets the callable invoked on enter/exit transitions as
   * callback(name, entered); pass null to clear it.
   */
  @carbon.method
  @impl.implemented
  SetCallback(callback)
  {
    this.#callback = typeof callback === "function" ? callback : null;
  }

  /**
   * The error thrown by the most recent callback invocation, or null; Carbon
   * reports script exceptions to the log and continues (ReportException,
   * EveTriggerVolume.cpp:60-69) - the runtime has no log seam, so the error
   * is kept readable here instead of vanishing or breaking the update loop.
   */
  GetLastCallbackError()
  {
    return this.#lastCallbackError;
  }

  /** Invokes the stored callback, isolating the update loop from callback errors. */
  #InvokeCallback(entered)
  {
    const callback = this.#callback;
    if (!callback) return;
    try
    {
      this.#lastCallbackError = null;
      callback(this.name, entered);
    }
    catch (error)
    {
      this.#lastCallbackError = error;
    }
  }

  #lastCallbackError = null;

  /**
   * Rebuilds the world transform from the position and rotation curves
   * (Carbon EveTriggerVolume.cpp:71-95): row-vector
   * RotationMatrix * TranslationMatrix = rotate about the origin, then place.
   */
  #UpdateWorldTransform(time)
  {
    EveTriggerVolume.#UpdateCurve(
      this.translationCurve, time, CURVE_TRANSLATION_SCRATCH, EveTriggerVolume.#zeroTranslation);
    EveTriggerVolume.#UpdateCurve(
      this.rotationCurve, time, CURVE_ROTATION_SCRATCH, EveTriggerVolume.#identityRotation);
    mat4.fromRotationTranslation(
      this.#worldTransform, CURVE_ROTATION_SCRATCH, CURVE_TRANSLATION_SCRATCH);
  }

  /**
   * Recomputes the broad-phase bounding sphere from the volume list (Carbon
   * EveTriggerVolume.cpp:21-53): volumes with no usable sphere are skipped,
   * contained spheres collapse, and the merge grows the enclosing sphere.
   */
  #RebuildBoundingSphere()
  {
    this.#boundingSphereInitialized = false;
    vec3.set(this.#boundingSphereCenter, 0, 0, 0);
    this.#boundingSphereRadius = 0;

    for (const volume of this.volumes)
    {
      const volumeSphere = volume.GetBoundingSphere();
      if (!volumeSphere) continue;

      if (!this.#boundingSphereInitialized ||
        EveTriggerVolume.#IsSphereInside(
          volumeSphere.center, volumeSphere.radius,
          this.#boundingSphereCenter, this.#boundingSphereRadius))
      {
        vec3.copy(this.#boundingSphereCenter, volumeSphere.center);
        this.#boundingSphereRadius = volumeSphere.radius;
        this.#boundingSphereInitialized = true;
        continue;
      }

      if (EveTriggerVolume.#IsSphereInside(
        this.#boundingSphereCenter, this.#boundingSphereRadius,
        volumeSphere.center, volumeSphere.radius))
      {
        continue;
      }

      const deltaX = volumeSphere.center[0] - this.#boundingSphereCenter[0];
      const deltaY = volumeSphere.center[1] - this.#boundingSphereCenter[1];
      const deltaZ = volumeSphere.center[2] - this.#boundingSphereCenter[2];
      const deltaLength = Math.hypot(deltaX, deltaY, deltaZ);
      const shift = 0.5 * (1 + (volumeSphere.radius - this.#boundingSphereRadius) / deltaLength);
      this.#boundingSphereCenter[0] += shift * deltaX;
      this.#boundingSphereCenter[1] += shift * deltaY;
      this.#boundingSphereCenter[2] += shift * deltaZ;
      this.#boundingSphereRadius =
        0.5 * (this.#boundingSphereRadius + volumeSphere.radius + deltaLength);
    }
  }

  /**
   * Returns the highest intensity any volume in the list gives the
   * object-space position, exiting early at 1 (Carbon cpp:109-122).
   */
  static #GetMaxIntensity(volumes, position)
  {
    let intensity = 0;
    for (const volume of volumes)
    {
      intensity = Math.max(intensity, volume.GetIntensity(position));
      if (intensity === 1) break;
    }
    return intensity;
  }

  /**
   * Evaluates whether the tracked position is inside the volumes and fires
   * the callback on transitions (Carbon cpp:124-158). The intensity resets
   * to 0 every call; the callback fires only on threshold-crossing edges.
   */
  #UpdateTriggerState(time)
  {
    this.intensity = 0;

    let inside = false;
    if (this.trackedPositionCurve && this.volumes.length)
    {
      EveTriggerVolume.#UpdateCurve(
        this.trackedPositionCurve, time, TRACKED_POSITION_SCRATCH, EveTriggerVolume.#zeroTranslation);

      if (!mat4.invert(INVERSE_WORLD_SCRATCH, this.#worldTransform))
      {
        mat4.identity(INVERSE_WORLD_SCRATCH);
      }
      vec3.transformMat4(OBJECT_POSITION_SCRATCH, TRACKED_POSITION_SCRATCH, INVERSE_WORLD_SCRATCH);

      if (this.#boundingSphereInitialized &&
        vec3.squaredDistance(OBJECT_POSITION_SCRATCH, this.#boundingSphereCenter) <=
          this.#boundingSphereRadius * this.#boundingSphereRadius + SPHERE_RADIUS_EPSILON)
      {
        this.intensity = EveTriggerVolume.#GetMaxIntensity(this.volumes, OBJECT_POSITION_SCRATCH);
        if (this.intensity !== 0)
        {
          const negativeIntensity =
            EveTriggerVolume.#GetMaxIntensity(this.exclusionVolumes, OBJECT_POSITION_SCRATCH);
          this.intensity = Math.max(0, this.intensity - negativeIntensity);
        }
      }

      inside = this.intensity >= this.enterThreshold;
    }

    if (inside !== this.isInside)
    {
      this.isInside = inside;
      this.#InvokeCallback(inside);
    }
  }

  /** Advances the transform, the bounding sphere and the trigger state every sync update. */
  @carbon.method
  @impl.implemented
  UpdateSyncronous(updateContext = null)
  {
    const time = EveTriggerVolume.#GetTime(updateContext);
    this.#UpdateWorldTransform(time);
    this.#RebuildBoundingSphere();
    this.#UpdateTriggerState(time);
  }

  /** Carbon's async update is empty (cpp:160-162). */
  @carbon.method
  @impl.implemented
  UpdateAsyncronous(_updateContext = null)
  {
  }

  /** Carbon's visibility update is empty (cpp:164-166). */
  @carbon.method
  @impl.implemented
  UpdateVisibility(_updateContext = null, _parentTransform = null)
  {
  }

  /** The trigger volume renders nothing (cpp:168-170). */
  @carbon.method
  @impl.implemented
  GetRenderables(_renderables, _impostors = null)
  {
  }

  /**
   * Writes the world-space bounding sphere, its radius floored at 1 so the
   * object stays pickable (Carbon cpp:172-177); always reports true.
   */
  @carbon.method
  @impl.implemented
  GetBoundingSphere(sphere = vec4.create(), _query = 0)
  {
    vec3.transformMat4(WORLD_CENTER_SCRATCH, this.#boundingSphereCenter, this.#worldTransform);
    vec4.set(sphere,
      WORLD_CENTER_SCRATCH[0], WORLD_CENTER_SCRATCH[1], WORLD_CENTER_SCRATCH[2],
      Math.max(this.#boundingSphereRadius, 1));
    return true;
  }

  /** Refreshes the world transform at a time and writes the model centre (cpp:179-183). */
  @carbon.method
  @impl.implemented
  UpdateModelCenterWorldPosition(position, time = 0)
  {
    this.#UpdateWorldTransform(time);
    return this.GetModelCenterWorldPosition(position);
  }

  /** Writes the bounding-sphere centre in world space (cpp:185-188). */
  @carbon.method
  @impl.implemented
  GetModelCenterWorldPosition(position = vec3.create())
  {
    return vec3.transformMat4(position, this.#boundingSphereCenter, this.#worldTransform);
  }

  /**
   * Writes the local bounding box, falling back to a unit box when no volumes
   * are set up yet so the object stays pickable (cpp:190-199); always true.
   */
  @carbon.method
  @impl.implemented
  GetLocalBoundingBox(min = vec3.create(), max = vec3.create())
  {
    const radius = Math.max(this.#boundingSphereRadius, 1);
    vec3.set(min,
      this.#boundingSphereCenter[0] - radius,
      this.#boundingSphereCenter[1] - radius,
      this.#boundingSphereCenter[2] - radius);
    vec3.set(max,
      this.#boundingSphereCenter[0] + radius,
      this.#boundingSphereCenter[1] + radius,
      this.#boundingSphereCenter[2] + radius);
    return true;
  }

  /** Writes the current world transform (cpp:201-204). */
  @carbon.method
  @impl.implemented
  GetLocalToWorldTransform(transform = mat4.create())
  {
    return mat4.copy(transform, this.#worldTransform);
  }

  /** The world translation of the trigger volume (cpp:206-209). */
  @carbon.method
  @impl.implemented
  GetWorldPosition(out = vec3.create())
  {
    return vec3.set(out,
      this.#worldTransform[12], this.#worldTransform[13], this.#worldTransform[14]);
  }

  /** The normalized world rotation of the trigger volume (cpp:211-214). */
  @carbon.method
  @impl.implemented
  GetWorldRotation(out = quat.create())
  {
    mat4.getRotation(out, this.#worldTransform);
    return quat.normalize(out, out);
  }

  /** Primes the transform at time 0 and builds the initial bounding sphere (cpp:216-221). */
  @carbon.method
  @impl.implemented
  Initialize()
  {
    this.#UpdateWorldTransform(0);
    this.#RebuildBoundingSphere();
    return true;
  }

  /**
   * Whether the tracked position currently counts as inside; mirrors the
   * READ-only Blue attribute for programmatic consumers.
   */
  @carbon.method
  @impl.implemented
  IsInside()
  {
    return this.isInside;
  }

  /** Reports whether sphere `b` fits entirely inside sphere `a` (Carbon Sphere_inline.h:119-133). */
  static #IsSphereInside(aCenter, aRadius, bCenter, bRadius)
  {
    if (aRadius < bRadius) return false;
    const difference = aRadius - bRadius;
    return vec3.squaredDistance(bCenter, aCenter) <= difference * difference;
  }

  /** Evaluates a curve at a time into out, falling back when no curve is wired. */
  static #UpdateCurve(curve, time, out, fallback)
  {
    if (!curve)
    {
      for (let index = 0; index < out.length; index++) out[index] = fallback[index];
      return out;
    }
    let result;
    if (typeof curve.Update === "function") result = curve.Update(time, out);
    else if (typeof curve.GetValueAt === "function") result = curve.GetValueAt(time, out);
    if ((Array.isArray(result) || ArrayBuffer.isView(result)) && result !== out)
    {
      for (let index = 0; index < out.length; index++) out[index] = result[index];
    }
    return out;
  }

  /** Reads the frame time from the duck-typed update context. */
  static #GetTime(updateContext)
  {
    if (!updateContext) return 0;
    if (typeof updateContext.GetTime === "function") return Number(updateContext.GetTime()) || 0;
    return Number(updateContext.currentTime ?? updateContext.time ?? 0) || 0;
  }

  static #zeroTranslation = Object.freeze([ 0, 0, 0 ]);

  static #identityRotation = Object.freeze([ 0, 0, 0, 1 ]);

}
