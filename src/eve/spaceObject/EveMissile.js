// Source: trinity/trinity/Eve/SpaceObject/EveMissile.h
// Source: trinity/trinity/Eve/SpaceObject/EveMissile.cpp
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { quat } from "@carbonenginejs/runtime-utils/quat";
import { sph3 } from "@carbonenginejs/runtime-utils/sph3";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { EveLODHelper, Tr2Lod } from "../EveLODHelper.js";
import { EveSpaceObject2 } from "./EveSpaceObject2.js";
import { EveMissileWarhead } from "./EveMissileWarhead.js";


/**
 * A missile in flight: the curve-driven ball path plus the warheads that ride
 * it, own the targeting state and supply all of its renderables and bounds.
 */
@type.define({ className: "EveMissile", family: "eve/spaceObject" })
export class EveMissile extends EveSpaceObject2
{
  @io.persist @type.list("EveMissileWarhead") warheads = [];
  @io.readwrite @type.boolean updateWarheads = true;
  @io.readwrite @type.objectRef("ITriTargetable") target = null;
  @io.readwrite @type.float32 targetRadius = 0;
  @io.readwrite @type.rawStruct("BlueScriptCallback") explosionCallback = null;

  #inheritedStartVelocity = vec3.create();
  #inheritedVelocity = vec3.create();
  #time = 0;
  #estimatedTotalAliveTime = 1;
  #lastValidSpeed = 0;

  /**
   * Runs the base initialization and silences all warhead particle emitting
   * until launch.
   */
  @carbon.method
  @impl.implemented
  Initialize()
  {
    super.Initialize();
    for (const warhead of this.warheads) warhead?.EnableParticleEmitting?.(false);
    return true;
  }

  /**
   * Arms the missile for a new flight: latches the launching ship's velocity and
   * the estimated flying time, resets the flight clock, and silences warhead
   * emitting.
   */
  @carbon.method
  @impl.implemented
  Start(shipVelocity, estimatedFlyingTime)
  {
    vec3.copy(this.#inheritedVelocity, shipVelocity ?? EveMissile.#zero);
    this.#estimatedTotalAliveTime = Number(estimatedFlyingTime) || 0;
    for (const warhead of this.warheads) warhead?.EnableParticleEmitting?.(false);
    this.#time = 0;
    vec3.copy(this.#inheritedStartVelocity, this.#inheritedVelocity);
    this.#lastValidSpeed = 0;
  }

  /**
   * Samples the flight path and its derivative to keep the estimated
   * time-to-target current, then for each live warhead advances the state
   * machine, hands it the target locator offset in missile space, integrates its
   * flight and fires the explosion callback on detonation, and finally rebuilds
   * the missile bounding sphere from the warheads.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Targetable output parameters and curve samples use the org-standard out-last convention; CPU flight behavior remains source-faithful.")
  UpdateSyncronous(context)
  {
    super.UpdateSyncronous(context);
    const time = Number(context?.GetTime?.() ?? context?.currentTime ?? context?.time ?? 0);
    const deltaTime = Number(context?.GetDeltaT?.() ?? context?.deltaTime ?? context?.deltaT ?? 0);
    mat4.identity(EveMissile.#inverseBallRotation);
    if (this.rotationCurve)
    {
      sampleCurve(this.rotationCurve, time, EveMissile.#ballRotation, EveMissile.#identityRotation);
      quat.invert(EveMissile.#ballRotation, EveMissile.#ballRotation);
      mat4.fromQuat(EveMissile.#inverseBallRotation, EveMissile.#ballRotation);
    }
    this.#time += deltaTime;
    vec3.set(EveMissile.#missilePosition, 0, 0, 0);
    vec3.set(EveMissile.#missileVelocity, 0, 0, 0);
    if (this.translationCurve && this.target)
    {
      sampleCurve(this.translationCurve, time, EveMissile.#missilePosition, EveMissile.#zero);
      sampleDerivative(this.translationCurve, time, EveMissile.#missileVelocity);
      this.target.GetDamageLocatorPosition?.(-1, true, EveMissile.#targetPosition);
      const speed = vec3.length(EveMissile.#missileVelocity);
      if (speed > 0)
      {
        this.#estimatedTotalAliveTime = this.#time + (vec3.distance(EveMissile.#missilePosition, EveMissile.#targetPosition) - this.targetRadius) / speed;
        this.#lastValidSpeed = speed;
      }
      else if (this.#lastValidSpeed > 0)
      {
        vec3.subtract(EveMissile.#missileVelocity, EveMissile.#missilePosition, EveMissile.#targetPosition);
        const length = vec3.length(EveMissile.#missileVelocity);
        if (length) vec3.scale(EveMissile.#missileVelocity, EveMissile.#missileVelocity, this.#lastValidSpeed / length);
      }
    }

    vec3.copy(EveMissile.#worldPosition, this.GetWorldPosition());
    const originShift = context?.GetOriginShift?.() ?? context?.originShift ?? EveMissile.#zero;
    for (const warhead of this.warheads)
    {
      if (!warhead) continue;
      const event = warhead.UpdateState(deltaTime, this.#estimatedTotalAliveTime, this.target);
      if (warhead.GetState() !== EveMissileWarhead.State.STATE_DEAD)
      {
        vec3.copy(EveMissile.#locatorPosition, EveMissile.#worldPosition);
        if (this.target) this.target.GetDamageLocatorPosition?.(warhead.GetTargetLocator(), true, EveMissile.#locatorPosition);
        vec3.subtract(EveMissile.#locatorOffset, EveMissile.#locatorPosition, EveMissile.#worldPosition);
        vec3.transformMat4(EveMissile.#locatorOffset, EveMissile.#locatorOffset, EveMissile.#inverseBallRotation);
        mat4.fromTranslation(EveMissile.#locatorTransform, EveMissile.#locatorOffset);
        warhead.UpdateEndTransform(EveMissile.#locatorTransform, event === EveMissileWarhead.StateChangeEvent.EVT_SWITCH_TARGET);
        if (this.updateWarheads)
        {
          warhead.UpdateWarhead(deltaTime, this.#estimatedTotalAliveTime, EveMissile.#missileVelocity, this.#inheritedVelocity, EveMissile.#inverseBallRotation, this.worldTransform, originShift);
        }
        warhead.Update(context);
      }
      const impactEvent = warhead.CheckImpact(deltaTime, this.#estimatedTotalAliveTime, this.target);
      if (impactEvent === EveMissileWarhead.StateChangeEvent.EVT_EXPLODE) callExplosionCallback(this.explosionCallback, warhead.GetWarheadID());
    }
    this.RebuildMissileBoundingSphere();
    return true;
  }

  /**
   * Runs each warhead's visibility pass against the missile world transform
   * composed with that warhead's offset, and merges the warheads' LOD levels
   * into the missile's.
   */
  @carbon.method
  @impl.implemented
  UpdateVisibility(context, _parentTransform = EveMissile.#identity)
  {
    for (const warhead of this.warheads)
    {
      if (!warhead) continue;
      mat4.multiply(EveMissile.#warheadTransform, this.worldTransform, warhead.GetCurrentOffsetTransform());
      warhead.UpdateVisibility(context, EveMissile.#warheadTransform);
      this.lodLevel = EveLODHelper.MergeLOD(this.lodLevel, warhead.GetLODLevel?.() ?? Tr2Lod.TR2_LOD_UNSPECIFIED);
    }
    return true;
  }

  /** Collects only the warheads' renderables - the missile itself owns no mesh. */
  @carbon.method
  @impl.implemented
  GetRenderables(out = [])
  {
    for (const warhead of this.warheads) warhead?.GetRenderables?.(out);
    return out;
  }

  /**
   * Writes the missile's world-space bounding sphere, built from the
   * warhead-derived local sphere and the missile world transform.
   */
  @carbon.method
  @impl.implemented
  GetBoundingSphere(out = vec4.create())
  {
    vec4.set(EveMissile.#localSphere, this.boundingSphereCenter[0], this.boundingSphereCenter[1], this.boundingSphereCenter[2], this.boundingSphereRadius);
    sph3.transformMat4(out, EveMissile.#localSphere, this.worldTransform);
    return true;
  }

  /**
   * Recomputes the missile's local bounding sphere as the union of its warheads'
   * local spheres.
   */
  @carbon.method
  @impl.implemented
  RebuildMissileBoundingSphere()
  {
    vec4.set(EveMissile.#mergedSphere, 0, 0, 0, 0);
    for (const warhead of this.warheads)
    {
      if (!warhead?.GetLocalBoundingSphere?.(EveMissile.#warheadSphere)) continue;
      sph3.union(EveMissile.#mergedSphere, EveMissile.#mergedSphere, EveMissile.#warheadSphere);
    }
    vec3.set(this.boundingSphereCenter, EveMissile.#mergedSphere[0], EveMissile.#mergedSphere[1], EveMissile.#mergedSphere[2]);
    this.boundingSphereRadius = EveMissile.#mergedSphere[3];
    return true;
  }

  /**
   * Returns null: the missile owns no renderable, so each warhead publishes its
   * own per-object record.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("The missile owns no renderable; its warheads publish their own backend-neutral records.")
  GetPerObjectData()
  {
    return null;
  }

  static #zero = vec3.create();
  static #identity = mat4.create();
  static #identityRotation = quat.create();
  static #ballRotation = quat.create();
  static #inverseBallRotation = mat4.create();
  static #missilePosition = vec3.create();
  static #missileVelocity = vec3.create();
  static #targetPosition = vec3.create();
  static #worldPosition = vec3.create();
  static #locatorPosition = vec3.create();
  static #locatorOffset = vec3.create();
  static #locatorTransform = mat4.create();
  static #warheadTransform = mat4.create();
  static #localSphere = vec4.create();
  static #warheadSphere = vec4.create();
  static #mergedSphere = vec4.create();
}

function sampleCurve(curve, time, out, fallback)
{
  const value = curve?.GetValueAt?.(time, out) ?? curve?.Update?.(time, out);
  if (value?.length >= out.length && value !== out) out.set(value);
  else if (value === undefined && !curve?.GetValueAt && !curve?.Update) out.set(fallback);
  return out;
}

function sampleDerivative(curve, time, out)
{
  const value = curve?.GetValueDotAt?.(time, out);
  if (value?.length >= 3 && value !== out) vec3.copy(out, value);
  else if (!curve?.GetValueDotAt) vec3.set(out, 0, 0, 0);
  return out;
}

function callExplosionCallback(callback, id)
{
  if (typeof callback === "function") callback(id);
  else callback?.CallVoid?.(id);
}
