import { ITr2DebugRenderable } from "../../global/interfaces/ITr2DebugRenderable.js";
import { IWorldPosition } from "../core/IWorldPosition.js";
// Source: trinity/trinity/Eve/EveTriggerVolume.h
// Source: trinity/trinity/Eve/EveTriggerVolume.cpp
// Source: trinity/trinity/Eve/EveTriggerVolume_Blue.cpp
import { IInitialize } from "../../global/blue/IInitialize.js";
import { mat4 } from "#math/mat4";
import { IEveSpaceObject2 } from "./IEveSpaceObject2.js";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { color as colorMath } from "#math/color";
import { meta, type, blue } from "#schema";
import { ITr2DebugRenderer2, Tr2DebugColor, Tr2DebugObjectReference } from "#interfaces";

const WORLD_CENTER_SCRATCH = vec3.create();
const TRACKED_POSITION_SCRATCH = vec3.create();
const OBJECT_POSITION_SCRATCH = vec3.create();
const INVERSE_WORLD_SCRATCH = mat4.create();
const CURVE_TRANSLATION_SCRATCH = vec3.create();
const CURVE_ROTATION_SCRATCH = quat.create();
// RenderDebugInfo scratch (debug drawing is single-threaded).
const DEBUG_SPHERE_TRANSFORM = mat4.create();

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
@blue.define("EveTriggerVolume")
@blue.inherit(IWorldPosition, IEveSpaceObject2, IInitialize, ITr2DebugRenderable)
@blue.interface(IEveSpaceObject2, IInitialize, IWorldPosition, ITr2DebugRenderable)
export class EveTriggerVolume
{

  /** Name identifier, passed to the callback so one handler can serve many trigger volumes. */
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  /** The volumes defining the trigger region. */
  @blue.read
  @blue.persist
  @type.list("IEveVolume")
  volumes = [];

  /** Volumes subtracted from the trigger region. */
  @blue.read
  @blue.persist
  @type.list("IEveVolume")
  exclusionVolumes = [];

  /** Volume intensity (0..1) at which the tracked position counts as inside. */
  @blue.readwrite
  @blue.persist
  @type.float32
  enterThreshold = 0.5;

  /** External parameters exposing per-placement values, e.g. for dungeon asset manipulations. */
  @blue.read
  @blue.persist
  @type.list("Tr2ExternalParameter")
  externalParameters = [];

  /** m_ballPosition: vector function slot placing the trigger volume. */
  @blue.readwrite
  @blue.persist
  @type.rootRef("ITriVectorFunction")
  translationCurve = null;

  /** m_ballRotation: quaternion function slot rotating the trigger volume. */
  @blue.readwrite
  @blue.persist
  @type.rootRef("ITriQuaternionFunction")
  rotationCurve = null;

  /**
   * m_trackedPosition: vector function slot for the tracked position. Carbon
   * exposes it READWRITE but NOT PERSIST (EveTriggerVolume_Blue.cpp:58-62) -
   * destiny wires it at runtime, so it never serializes.
   */
  @blue.readwrite
  @type.rootRef("ITriVectorFunction")
  trackedPositionCurve = null;

  /** Whether the tracked position is currently inside the trigger region. */
  @blue.read
  @type.boolean
  isInside = false;

  /** m_currentIntensity: most recent evaluated volume intensity of the tracked position. */
  @blue.read
  @type.float32
  intensity = 0;

  _worldTransform = mat4.create();

  // Carbon CcpMath::Sphere carries a radius<0 sentinel (Sphere_inline.h:9-13,
  // 33-36); the production port carries an explicit flag instead of
  // overloading the radius (2026-09-04 decision in the new-classes spec).
  _boundingSphereCenter = vec3.create();

  _boundingSphereRadius = 0;

  _boundingSphereInitialized = false;

  _callback = null;

  /**
   * Sets the callable invoked on enter/exit transitions as
   * callback(name, entered); pass null to clear it.
   */
  @blue.method
  @meta.implemented
  SetCallback(callback)
  {
    this._callback = typeof callback === "function" ? callback : null;
  }

  /**
   * The error thrown by the most recent callback invocation, or null; Carbon
   * reports script exceptions to the log and continues (ReportException,
   * EveTriggerVolume.cpp:60-69) - the runtime has no log seam, so the error
   * is kept readable here instead of vanishing or breaking the update loop.
   */
  GetLastCallbackError()
  {
    return this._lastCallbackError;
  }

  /** Invokes the stored callback, isolating the update loop from callback errors. */
  @blue.method
  _InvokeCallback(entered)
  {
    const callback = this._callback;
    if (!callback) return;
    try
    {
      this._lastCallbackError = null;
      callback(this.name, entered);
    }
    catch (error)
    {
      this._lastCallbackError = error;
    }
  }

  _lastCallbackError = null;

  /**
   * Rebuilds the world transform from the position and rotation curves
   * (Carbon EveTriggerVolume.cpp:71-95): row-vector
   * RotationMatrix * TranslationMatrix = rotate about the origin, then place.
   */
  @blue.method
  _UpdateWorldTransform(time)
  {
    if (this.translationCurve) this.translationCurve.Update__Ticks(time, CURVE_TRANSLATION_SCRATCH);
    else vec3.copy(CURVE_TRANSLATION_SCRATCH, EveTriggerVolume._zeroTranslation);
    if (this.rotationCurve) this.rotationCurve.Update__Ticks(time, CURVE_ROTATION_SCRATCH);
    else quat.copy(CURVE_ROTATION_SCRATCH, EveTriggerVolume._identityRotation);
    mat4.fromRotationTranslation(
      this._worldTransform, CURVE_ROTATION_SCRATCH, CURVE_TRANSLATION_SCRATCH);
  }

  /**
   * Recomputes the broad-phase bounding sphere from the volume list (Carbon
   * EveTriggerVolume.cpp:21-53): volumes with no usable sphere are skipped,
   * contained spheres collapse, and the merge grows the enclosing sphere.
   */
  @blue.method
  _RebuildBoundingSphere()
  {
    this._boundingSphereInitialized = false;
    vec3.set(this._boundingSphereCenter, 0, 0, 0);
    this._boundingSphereRadius = 0;

    for (const volume of this.volumes)
    {
      const volumeSphere = volume.GetBoundingSphere();
      if (!volumeSphere) continue;

      if (!this._boundingSphereInitialized ||
        EveTriggerVolume._IsSphereInside(
          volumeSphere.center, volumeSphere.radius,
          this._boundingSphereCenter, this._boundingSphereRadius))
      {
        vec3.copy(this._boundingSphereCenter, volumeSphere.center);
        this._boundingSphereRadius = volumeSphere.radius;
        this._boundingSphereInitialized = true;
        continue;
      }

      if (EveTriggerVolume._IsSphereInside(
        this._boundingSphereCenter, this._boundingSphereRadius,
        volumeSphere.center, volumeSphere.radius))
      {
        continue;
      }

      const deltaX = volumeSphere.center[0] - this._boundingSphereCenter[0];
      const deltaY = volumeSphere.center[1] - this._boundingSphereCenter[1];
      const deltaZ = volumeSphere.center[2] - this._boundingSphereCenter[2];
      const deltaLength = Math.hypot(deltaX, deltaY, deltaZ);
      const shift = 0.5 * (1 + (volumeSphere.radius - this._boundingSphereRadius) / deltaLength);
      this._boundingSphereCenter[0] += shift * deltaX;
      this._boundingSphereCenter[1] += shift * deltaY;
      this._boundingSphereCenter[2] += shift * deltaZ;
      this._boundingSphereRadius =
        0.5 * (this._boundingSphereRadius + volumeSphere.radius + deltaLength);
    }
  }

  /**
   * Returns the highest intensity any volume in the list gives the
   * object-space position, exiting early at 1 (Carbon cpp:109-122).
   */
  @blue.method
  static _GetMaxIntensity(volumes, position)
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
  @blue.method
  _UpdateTriggerState(time)
  {
    this.intensity = 0;

    let inside = false;
    if (this.trackedPositionCurve && this.volumes.length)
    {
      this.trackedPositionCurve.Update__Ticks(time, TRACKED_POSITION_SCRATCH);

      if (!mat4.invert(INVERSE_WORLD_SCRATCH, this._worldTransform))
      {
        mat4.identity(INVERSE_WORLD_SCRATCH);
      }
      vec3.transformMat4(OBJECT_POSITION_SCRATCH, TRACKED_POSITION_SCRATCH, INVERSE_WORLD_SCRATCH);

      if (this._boundingSphereInitialized &&
        vec3.squaredDistance(OBJECT_POSITION_SCRATCH, this._boundingSphereCenter) <=
          this._boundingSphereRadius * this._boundingSphereRadius + SPHERE_RADIUS_EPSILON)
      {
        this.intensity = EveTriggerVolume._GetMaxIntensity(this.volumes, OBJECT_POSITION_SCRATCH);
        if (this.intensity !== 0)
        {
          const negativeIntensity =
            EveTriggerVolume._GetMaxIntensity(this.exclusionVolumes, OBJECT_POSITION_SCRATCH);
          this.intensity = Math.max(0, this.intensity - negativeIntensity);
        }
      }

      inside = this.intensity >= this.enterThreshold;
    }

    if (inside !== this.isInside)
    {
      this.isInside = inside;
      this._InvokeCallback(inside);
    }
  }

  /** Advances the transform, the bounding sphere and the trigger state every sync update. */
  @blue.method
  @meta.implemented
  UpdateSyncronous(updateContext = null)
  {
    const time = updateContext.GetTime();
    this._UpdateWorldTransform(time);
    this._RebuildBoundingSphere();
    this._UpdateTriggerState(time);
  }

  /** Carbon's async update is empty (cpp:160-162). */
  @blue.method
  @meta.implemented
  UpdateAsyncronous(_updateContext = null)
  {
  }

  /** Carbon's visibility update is empty (cpp:164-166). */
  @blue.method
  @meta.implemented
  UpdateVisibility(_updateContext = null, _parentTransform = null)
  {
  }

  /** The trigger volume renders nothing (cpp:168-170). */
  @blue.method
  @meta.implemented
  GetRenderables__Impostors(_renderables, _impostors)
  {
  }

  /**
   * Writes the world-space bounding sphere, its radius floored at 1 so the
   * object stays pickable (Carbon cpp:172-177); always reports true.
   */
  @blue.method
  @meta.implemented
  GetBoundingSphere(sphere = vec4.create(), _query = 0)
  {
    vec3.transformMat4(WORLD_CENTER_SCRATCH, this._boundingSphereCenter, this._worldTransform);
    vec4.set(sphere,
      WORLD_CENTER_SCRATCH[0], WORLD_CENTER_SCRATCH[1], WORLD_CENTER_SCRATCH[2],
      Math.max(this._boundingSphereRadius, 1));
    return true;
  }

  /** Refreshes the world transform at a time and writes the model centre (cpp:179-183). */
  @blue.method
  @meta.implemented
  UpdateModelCenterWorldPosition(position, time = 0)
  {
    this._UpdateWorldTransform(time);
    return this.GetModelCenterWorldPosition(position);
  }

  /** Writes the bounding-sphere centre in world space (cpp:185-188). */
  @blue.method
  @meta.implemented
  GetModelCenterWorldPosition(position = vec3.create())
  {
    return vec3.transformMat4(position, this._boundingSphereCenter, this._worldTransform);
  }

  /**
   * Writes the local bounding box, falling back to a unit box when no volumes
   * are set up yet so the object stays pickable (cpp:190-199); always true.
   */
  @blue.method
  @meta.implemented
  GetLocalBoundingBox(min = vec3.create(), max = vec3.create())
  {
    const radius = Math.max(this._boundingSphereRadius, 1);
    vec3.set(min,
      this._boundingSphereCenter[0] - radius,
      this._boundingSphereCenter[1] - radius,
      this._boundingSphereCenter[2] - radius);
    vec3.set(max,
      this._boundingSphereCenter[0] + radius,
      this._boundingSphereCenter[1] + radius,
      this._boundingSphereCenter[2] + radius);
    return true;
  }

  /** Writes the current world transform (cpp:201-204). */
  @blue.method
  @meta.implemented
  GetLocalToWorldTransform(transform = mat4.create())
  {
    return mat4.copy(transform, this._worldTransform);
  }

  /** The world translation of the trigger volume (cpp:206-209). */
  @blue.method
  @meta.implemented
  GetWorldPosition(out)
  {
    return vec3.set(out,
      this._worldTransform[12], this._worldTransform[13], this._worldTransform[14]);
  }

  /** The normalized world rotation of the trigger volume (cpp:211-214). */
  @blue.method
  @meta.implemented
  GetWorldRotation(out = quat.create())
  {
    mat4.getRotation(out, this._worldTransform);
    return quat.normalize(out, out);
  }

  /** Primes the transform at time 0 and builds the initial bounding sphere (cpp:216-221). */
  @blue.method
  @meta.implemented
  Initialize()
  {
    this._UpdateWorldTransform(0);
    this._RebuildBoundingSphere();
    return true;
  }

  /**
   * Carbon EveTriggerVolume::GetDebugOptions (EveTriggerVolume.cpp:223-228).
   * @param {Set<string>} options The caller-owned option set.
   */
  @blue.method
  @meta.implemented
  GetDebugOptions(options)
  {
    options.add("Trigger Volumes");
    options.add("Trigger Exclusion Volumes");
    options.add("Trigger Bounding Sphere");
  }

  /** RenderDebugInfo's volume colour scratch. */
  static _debugColor = colorMath.create();

  /**
   * Carbon EveTriggerVolume::RenderDebugInfo (EveTriggerVolume.cpp:230-259):
   * three independent options. "Trigger Volumes" has each volume draw itself
   * under the world transform, green while the tracked position is inside and
   * white otherwise; "Trigger Exclusion Volumes" draws the exclusion volumes in
   * red; "Trigger Bounding Sphere" draws the broad-phase sphere as a
   * 10-segment wireframe sphere.
   *
   * Carbon's CcpMath::Sphere marks an unset sphere with radius -1
   * (Sphere_inline.h:9-13); this class carries that as
   * _boundingSphereInitialized beside a radius of 0, so the radius passed is
   * -1 while the flag is clear, as Carbon passes it.
   * @param {ITr2DebugRenderer2} renderer
   */
  @blue.method
  @meta.implemented
  RenderDebugInfo(renderer)
  {
    if (renderer.HasOption(this, "Trigger Volumes"))
    {
      // green when the tracked position is inside, white otherwise
      let color = 0xFFFFFFFF;
      if (this.isInside)
      {
        color = 0xFF33FF33;
      }

      // Carbon's uint32 argument converts implicitly to Color.
      colorMath.fromARGB(EveTriggerVolume._debugColor, color);
      for (const volume of this.volumes)
      {
        volume.RenderDebugInfo(renderer, this._worldTransform, EveTriggerVolume._debugColor);
      }
    }

    if (renderer.HasOption(this, "Trigger Exclusion Volumes"))
    {
      for (const volume of this.exclusionVolumes)
      {
        volume.RenderDebugInfo(renderer, this._worldTransform, colorMath.fromARGB(EveTriggerVolume._debugColor, 0xFFFF3333));
      }
    }

    if (renderer.HasOption(this, "Trigger Bounding Sphere"))
    {
      const transform = mat4.fromTranslation(DEBUG_SPHERE_TRANSFORM, this._boundingSphereCenter);
      // Carbon (row-vector): TranslationMatrix( m_boundingSphere.center ) * m_worldTransform.
      mat4.multiply(transform, this._worldTransform, transform);
      renderer.DrawSphere__TransformRadius(
        Tr2DebugObjectReference.create__Object(this),
        transform,
        this._boundingSphereInitialized ? this._boundingSphereRadius : -1,
        10,
        ITr2DebugRenderer2.Effect.Wireframe,
        Tr2DebugColor.create__Uint32(0xff333333));
    }
  }

  /**
   * Whether the tracked position currently counts as inside; mirrors the
   * READ-only Blue attribute for programmatic consumers.
   */
  @meta.implemented
  IsInside()
  {
    return this.isInside;
  }

  /** Reports whether sphere `b` fits entirely inside sphere `a` (Carbon Sphere_inline.h:119-133). */
  static _IsSphereInside(aCenter, aRadius, bCenter, bRadius)
  {
    if (aRadius < bRadius) return false;
    const difference = aRadius - bRadius;
    return vec3.squaredDistance(bCenter, aCenter) <= difference * difference;
  }

  static _zeroTranslation = [ 0, 0, 0 ];

  static _identityRotation = [ 0, 0, 0, 1 ];

}
