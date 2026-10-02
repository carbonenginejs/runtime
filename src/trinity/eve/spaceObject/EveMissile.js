
import { IInitialize } from "../../../global/blue/IInitialize.js";
// Source: trinity/trinity/Eve/SpaceObject/EveMissile.h
// Source: trinity/trinity/Eve/SpaceObject/EveMissile.cpp
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { sph3 } from "#math/sph3";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { meta } from "#schema";
import { CjsScriptCallback } from "#blue/CjsScriptCallback";
import { IEveSpaceObject2 } from "../IEveSpaceObject2.js";
import { ITr2Renderable } from "../../core/ITr2Renderable.js";
import { EveLODHelper } from "../EveLODHelper.js";
import { EveSpaceObject2 } from "./EveSpaceObject2.js";
import { EveMissileWarhead } from "./EveMissileWarhead.js";


/**
 * A missile in flight: the curve-driven ball path plus the warheads that ride
 * it, own the targeting state and supply the missile bounds.
 */
@meta.define({ className: "EveMissile", family: "eve/spaceObject" })
@meta.blue.inherit(IInitialize)
export class EveMissile extends EveSpaceObject2
{
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("EveMissileWarhead") warheads = [];
  @meta.blue.readwrite
  @meta.type.boolean updateWarheads = true;
  @meta.blue.readwrite
  @meta.type.objectRef("ITriTargetable") target = null;
  @meta.blue.readwrite
  @meta.type.float32 targetRadius = 0;
  @meta.blue.readwrite
  @meta.type.rawStruct("BlueScriptCallback") explosionCallback = null;

  _inheritedStartVelocity = vec3.create();
  _inheritedVelocity = vec3.create();
  _time = 0;
  _estimatedTotalAliveTime = 1;
  _lastValidSpeed = 0;

  /** Registers each warhead's sprites; Carbon does not register the missile base. */
  @meta.blue.method
  @meta.implemented
  RegisterWithQuadRenderer(quadRenderer)
  {
    for (const warhead of this.warheads) warhead.RegisterWithQuadRenderer(quadRenderer);
  }

  /** Forwards quad submission to each warhead with the caller's frustum and renderer. */
  @meta.blue.method
  @meta.implemented
  AddQuadsToQuadRenderer(frustum, quadRenderer)
  {
    for (const warhead of this.warheads) warhead.AddQuadsToQuadRenderer(frustum, quadRenderer);
  }

  /**
   * Runs the base initialization and silences all warhead particle emitting
   * until launch.
   */
  @meta.blue.method
  @meta.implemented
  Initialize()
  {
    super.Initialize();
    for (const warhead of this.warheads) warhead.EnableParticleEmitting(false);
    return true;
  }

  /**
   * Arms the missile for a new flight: latches the launching ship's velocity and
   * the estimated flying time, resets the flight clock, and silences warhead
   * emitting.
   */
  @meta.blue.method
  @meta.implemented
  Start(shipVelocity, estimatedFlyingTime)
  {
    vec3.copy(this._inheritedVelocity, shipVelocity);
    this._estimatedTotalAliveTime = Number(estimatedFlyingTime) || 0;
    for (const warhead of this.warheads) warhead.EnableParticleEmitting(false);
    this._time = 0;
    vec3.copy(this._inheritedStartVelocity, this._inheritedVelocity);
    this._lastValidSpeed = 0;
  }

  /**
   * Samples the flight path and its derivative to keep the estimated
   * time-to-target current, then for each live warhead advances the state
   * machine, hands it the target locator offset in missile space, integrates its
   * flight and fires the explosion callback on detonation, and finally rebuilds
   * the missile bounding sphere from the warheads.
   *
   * Adapted: Target and curve output parameters are out-last; the optional script callback uses the existing JavaScript callback adapter at invocation.
   */
  @meta.blue.method
  @meta.adapted
  UpdateSyncronous(context)
  {
    super.UpdateSyncronous(context);
    const time = context.GetTime();
    const deltaTime = context.GetDeltaT();
    mat4.identity(EveMissile._inverseBallRotation);
    if (this.rotationCurve)
    {
      quat.identity(EveMissile._ballRotation);
      this.rotationCurve.Update(time, EveMissile._ballRotation);
      quat.invert(EveMissile._ballRotation, EveMissile._ballRotation);
      mat4.fromQuat(EveMissile._inverseBallRotation, EveMissile._ballRotation);
    }
    this._time += deltaTime;
    vec3.set(EveMissile._missilePosition, 0, 0, 0);
    vec3.set(EveMissile._missileVelocity, 0, 0, 0);
    if (this.translationCurve && this.target)
    {
      this.translationCurve.GetValueAt(time, EveMissile._missilePosition);
      this.translationCurve.GetValueDotAt(time, EveMissile._missileVelocity);
      this.target.GetDamageLocatorPosition(-1, true, EveMissile._targetPosition);
      const speed = vec3.length(EveMissile._missileVelocity);
      if (speed > 0)
      {
        this._estimatedTotalAliveTime = this._time + (vec3.distance(EveMissile._missilePosition, EveMissile._targetPosition) - this.targetRadius) / speed;
        this._lastValidSpeed = speed;
      }
      else if (this._lastValidSpeed > 0)
      {
        vec3.subtract(EveMissile._missileVelocity, EveMissile._missilePosition, EveMissile._targetPosition);
        const length = vec3.length(EveMissile._missileVelocity);
        if (length) vec3.scale(EveMissile._missileVelocity, EveMissile._missileVelocity, this._lastValidSpeed / length);
      }
    }

    vec3.copy(EveMissile._worldPosition, this.GetWorldPosition());
    const originShift = context.GetOriginShift();
    for (const warhead of this.warheads)
    {
      const event = warhead.UpdateState(deltaTime, this._estimatedTotalAliveTime, this.target);
      if (warhead.GetState() !== EveMissileWarhead.State.STATE_DEAD)
      {
        vec3.copy(EveMissile._locatorPosition, EveMissile._worldPosition);
        if (this.target) this.target.GetDamageLocatorPosition(warhead.GetTargetLocator(), true, EveMissile._locatorPosition);
        vec3.subtract(EveMissile._locatorOffset, EveMissile._locatorPosition, EveMissile._worldPosition);
        vec3.transformMat4(EveMissile._locatorOffset, EveMissile._locatorOffset, EveMissile._inverseBallRotation);
        mat4.fromTranslation(EveMissile._locatorTransform, EveMissile._locatorOffset);
        warhead.UpdateEndTransform(EveMissile._locatorTransform, event === EveMissileWarhead.StateChangeEvent.EVT_SWITCH_TARGET);
        if (this.updateWarheads)
        {
          warhead.UpdateWarhead(deltaTime, this._estimatedTotalAliveTime, EveMissile._missileVelocity, this._inheritedVelocity, EveMissile._inverseBallRotation, this.worldTransform, originShift);
        }
        warhead.Update(context);
      }
      const impactEvent = warhead.CheckImpact(deltaTime, this._estimatedTotalAliveTime, this.target);
      if (impactEvent === EveMissileWarhead.StateChangeEvent.EVT_EXPLODE && this.explosionCallback)
      {
        CjsScriptCallback.from(this.explosionCallback).CallVoid(warhead.GetWarheadID());
      }
    }
    this.RebuildMissileBoundingSphere();
    return true;
  }

  /**
   * Runs inherited visibility first, then each warhead's visibility pass against the missile world transform
   * composed with that warhead's offset, and merges the warheads' LOD levels
   * into the missile's.
   */
  @meta.blue.method
  @meta.implemented
  UpdateVisibility(context, parentTransform = EveMissile._identity)
  {
    super.UpdateVisibility(context, parentTransform);
    for (const warhead of this.warheads)
    {
      mat4.multiply(EveMissile._warheadTransform, this.worldTransform, warhead.GetCurrentOffsetTransform());
      warhead.UpdateVisibility(context, EveMissile._warheadTransform);
      this.lodLevel = EveLODHelper.MergeLOD(this.lodLevel, warhead.GetLODLevel());
    }
    return true;
  }

  /**
   * Collects inherited visual branches first, then each warhead's renderables.
   * Adapted: returns the caller's output array; the existing collectors do not
   * represent Carbon's impostor-manager argument.
   */
  @meta.blue.method
  @meta.adapted
  GetRenderables(out = [])
  {
    super.GetRenderables(out);
    for (const warhead of this.warheads) warhead.GetRenderables(out);
    return out;
  }

  /**
   * Writes the missile's world-space bounding sphere, built from the
   * warhead-derived local sphere and the missile world transform.
   */
  @meta.blue.method
  @meta.implemented
  GetBoundingSphere(out = vec4.create())
  {
    vec4.set(EveMissile._localSphere, this.boundingSphereCenter[0], this.boundingSphereCenter[1], this.boundingSphereCenter[2], this.boundingSphereRadius);
    sph3.transformMat4(out, EveMissile._localSphere, this.worldTransform);
    return true;
  }

  /**
   * Recomputes the missile's local bounding sphere as the union of its warheads'
   * local spheres.
   */
  @meta.blue.method
  @meta.implemented
  RebuildMissileBoundingSphere()
  {
    vec4.set(EveMissile._mergedSphere, 0, 0, 0, 0);
    for (const warhead of this.warheads)
    {
      if (!warhead.GetLocalBoundingSphere(EveMissile._warheadSphere)) continue;
      sph3.union(EveMissile._mergedSphere, EveMissile._mergedSphere, EveMissile._warheadSphere);
    }
    vec3.set(this.boundingSphereCenter, EveMissile._mergedSphere[0], EveMissile._mergedSphere[1], EveMissile._mergedSphere[2]);
    this.boundingSphereRadius = EveMissile._mergedSphere[3];
    return true;
  }

  /**
   * Returns null: the missile owns no renderable, so each warhead publishes its
   * own per-object record.
   *
   * Adapted: The missile owns no renderable; its warheads publish their own backend-neutral records.
   */
  @meta.blue.method
  @meta.adapted
  GetPerObjectData()
  {
    return null;
  }

  static _zero = vec3.create();
  static _identity = mat4.create();
  static _identityRotation = quat.create();
  static _ballRotation = quat.create();
  static _inverseBallRotation = mat4.create();
  static _missilePosition = vec3.create();
  static _missileVelocity = vec3.create();
  static _targetPosition = vec3.create();
  static _worldPosition = vec3.create();
  static _locatorPosition = vec3.create();
  static _locatorOffset = vec3.create();
  static _locatorTransform = mat4.create();
  static _warheadTransform = mat4.create();
  static _localSphere = vec4.create();
  static _warheadSphere = vec4.create();
  static _mergedSphere = vec4.create();
}

// Native concrete exposure chains EveSpaceObject2.
meta.blue.interfaceTable({
  interfaces: [ EveMissile, IEveSpaceObject2, ITr2Renderable ],
  chainTo: EveSpaceObject2
})(EveMissile, { kind: "class" });
