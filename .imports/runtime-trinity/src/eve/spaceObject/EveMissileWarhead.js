// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\EveMissileWarhead.h
// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\EveMissileWarhead.cpp
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { carbonPerlin1D } from "@carbonenginejs/runtime-utils/noise";
import { quat } from "@carbonenginejs/runtime-utils/quat";
import { sph3 } from "@carbonenginejs/runtime-utils/sph3";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { EveTransform } from "./EveTransform.js";
import { State, StateChangeEvent } from "../../generated/eve/spaceObject/enums.js";


/**
 * One warhead of a missile: its launch-to-explosion state machine, the
 * noise-perturbed offset path it flies relative to the missile, and the impact
 * test against the target.
 */
@type.define({ className: "EveMissileWarhead", family: "eve/spaceObject" })
export class EveMissileWarhead extends EveTransform
{
  @io.persist @type.float32 pathOffsetNoiseScale = 0;
  @io.persist @type.float32 pathOffsetNoiseSpeed = 1;
  @io.readwrite @type.boolean startDataValid = false;
  @io.readwrite @type.vec3 pathOffset = vec3.create();
  @io.persist @type.float32 maxExplosionDistance = 40;
  @io.persist @type.float32 impactDuration = 0.6;
  @io.read @type.vec3 explosionPosition = vec3.create();
  @io.persist @type.float32 impactSize = 0;
  @io.persist @type.model("EveSpriteSet") spriteSet = null;
  @io.read @type.int32 targetLocatorID = -1;
  @io.persist @type.float32 durationEjectPhase = 0;
  @io.readwrite @type.boolean doSpread = true;
  @io.persist @type.float32 acceleration = 1;
  @io.readwrite @type.int32 id = -1;
  @io.persist @type.float32 startEjectVelocity = 0;
  @io.persist @type.float32 warheadLength = 1;
  @io.persist @type.float32 warheadRadius = 1;

  #state = EveMissileWarhead.State.STATE_DELAYED;
  #flyingTime = 0;
  #movement = vec3.create();
  #positionLastFrame = vec3.create();
  #lastRelativePosition = vec3.create();
  #currentStartOffset = vec3.create();
  #startOrientation = quat.create();
  #oldEndOffset = vec3.create();
  #currentEndOffset = vec3.create();
  #endOffset = vec3.create();
  #currentOffset = vec3.create();
  #currentOrientation = quat.create();
  #currentEjectVelocity = 0;
  #currentDurationEjectPhase = 0;
  #currentOffsetTransform = mat4.create();
  #finalDestinationTimer = 0;
  #finalTargetTime = 0.75 - Math.random() * 0.1;
  #speedModifier = 1.04 - Math.random() * 0.08;
  #explosionDistance = 0;
  #bombFlightpath = false;
  #lastPositionValid = false;
  #noisePhase = EveMissileWarhead.#nextNoisePhase++ & 0xfff;
  #isVisible = true;

  /**
   * Resets the warhead to its pre-launch state and re-rolls the randomized
   * explosion distance, speed modifier and final-target timing that vary this
   * flight.
   */
  @carbon.method
  @impl.implemented
  PrepareLaunch()
  {
    this.#currentEjectVelocity = this.startEjectVelocity;
    this.#currentDurationEjectPhase = this.durationEjectPhase;
    const distance = this.maxExplosionDistance - Math.random() * this.maxExplosionDistance * 0.5;
    this.#explosionDistance = distance * distance;
    this.#state = EveMissileWarhead.State.STATE_DELAYED;
    this.#flyingTime = 0;
    vec3.set(this.#currentStartOffset, 0, 0, 0);
    quat.identity(this.#startOrientation);
    this.startDataValid = false;
    vec3.set(this.#oldEndOffset, 0, 0, 0);
    vec3.set(this.#currentEndOffset, 0, 0, 0);
    vec3.set(this.#endOffset, 0, 0, 0);
    vec3.set(this.#currentOffset, 0, 0, 0);
    quat.identity(this.#currentOrientation);
    this.#finalDestinationTimer = 0;
    this.targetLocatorID = -1;
    vec3.set(this.explosionPosition, 0, 0, 0);
    mat4.identity(this.#currentOffsetTransform);
    this.#speedModifier = 1.04 - Math.random() * 0.08;
    this.#finalTargetTime = 0.75 - Math.random() * 0.1;
    this.#bombFlightpath = false;
    this.#lastPositionValid = false;
  }

  /**
   * Latches the launch transform as the warhead's start offset and orientation
   * and marks the start data valid, which releases the state machine from its
   * delayed state.
   */
  @carbon.method
  @impl.implemented
  Launch(startTransform)
  {
    mat4.getRotation(this.#startOrientation, startTransform);
    vec3.set(this.#currentStartOffset, startTransform[12], startTransform[13], startTransform[14]);
    quat.copy(this.#currentOrientation, this.#startOrientation);
    vec3.copy(this.#currentOffset, this.#currentStartOffset);
    this.startDataValid = true;
    this.#lastPositionValid = false;
  }

  /**
   * Sets the destination offset the warhead flies toward; on a target switch it
   * also snapshots the previous destination and flight time so the change is
   * blended in rather than snapped.
   */
  @carbon.method
  @impl.implemented
  UpdateEndTransform(endTransform, switchLocators)
  {
    vec3.set(this.#endOffset, endTransform[12], endTransform[13], endTransform[14]);
    if (switchLocators)
    {
      this.#finalDestinationTimer = this.#flyingTime;
      vec3.copy(this.#oldEndOffset, this.#currentEndOffset);
    }
  }

  /**
   * Advances the delayed/launch/ejecting/tracking state machine by one frame, picking a damage locator when tracking begins and again at the spread-to-final switch.
   * @returns {number} The state-change event the missile must act on, or EVT_NONE.
   */
  @carbon.method
  @impl.implemented
  UpdateState(deltaTime, estimatedTotalAliveTime, target)
  {
    this.#bombFlightpath = !target;
    let event = EveMissileWarhead.StateChangeEvent.EVT_NONE;
    const totalFlyingTime = Math.max((Number(estimatedTotalAliveTime) + 0.1) * this.#speedModifier, Number.EPSILON);
    const flight = clamp01(this.#flyingTime / totalFlyingTime);
    switch (this.#state)
    {
      case EveMissileWarhead.State.STATE_DELAYED:
        if (this.startDataValid) this.#state = EveMissileWarhead.State.STATE_LAUNCH;
        break;
      case EveMissileWarhead.State.STATE_LAUNCH:
        this.EnableParticleEmitting(true);
        this.#state = EveMissileWarhead.State.STATE_EJECTING;
        break;
      case EveMissileWarhead.State.STATE_EJECTING:
        this.#currentDurationEjectPhase -= Number(deltaTime);
        if (this.#currentDurationEjectPhase <= 0)
        {
          this.#currentDurationEjectPhase = 0;
          this.#state = EveMissileWarhead.State.STATE_START_TRACKING;
        }
        break;
      case EveMissileWarhead.State.STATE_START_TRACKING:
        this.targetLocatorID = target ? Number(target.GetGoodDamageLocatorIndex?.(this.GetWorldPosition()) ?? -1) | 0 : -1;
        this.#state = estimatedTotalAliveTime >= 5 && this.doSpread
          ? EveMissileWarhead.State.STATE_TRACKING_SPREAD
          : EveMissileWarhead.State.STATE_TRACKING_FINAL;
        break;
      case EveMissileWarhead.State.STATE_TRACKING_SPREAD:
        if (flight >= this.#finalTargetTime)
        {
          this.targetLocatorID = target ? Number(target.GetGoodDamageLocatorIndex?.(this.GetWorldPosition()) ?? -1) | 0 : -1;
          event = EveMissileWarhead.StateChangeEvent.EVT_SWITCH_TARGET;
          this.#state = EveMissileWarhead.State.STATE_TRACKING_FINAL;
        }
        break;
      case EveMissileWarhead.State.STATE_EXPLODED:
        this.#state = EveMissileWarhead.State.STATE_DEAD;
        break;
      default:
        break;
    }
    return event;
  }

  /**
   * Tests the final tracking segment for a hit on the target - or detonates immediately when there is no target - recording the explosion position and spawning an impact on the target when impactSize is set.
   * @returns {number} EVT_EXPLODE when the warhead detonated this frame, otherwise EVT_NONE.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Targetable output parameters use the org-standard out-last calling convention.")
  CheckImpact(deltaTime, estimatedTotalAliveTime, target)
  {
    if (this.#state !== EveMissileWarhead.State.STATE_TRACKING_FINAL || this.id < 0) return EveMissileWarhead.StateChangeEvent.EVT_NONE;
    const totalFlyingTime = Math.max((Number(estimatedTotalAliveTime) + 0.1) * this.#speedModifier, Number.EPSILON);
    const flight = clamp01((this.#flyingTime - Number(deltaTime)) / totalFlyingTime);
    const positionNow = this.GetWorldPosition(EveMissileWarhead.#positionNow);
    if (!target)
    {
      vec3.copy(this.explosionPosition, positionNow);
      this.#state = EveMissileWarhead.State.STATE_EXPLODED;
      return EveMissileWarhead.StateChangeEvent.EVT_EXPLODE;
    }

    vec3.subtract(EveMissileWarhead.#positionLast, positionNow, this.#movement);
    vec3.copy(EveMissileWarhead.#targetPosition, positionNow);
    const hit = target.GetImpactPosition?.(this.targetLocatorID, EveMissileWarhead.#positionLast, positionNow, this.#explosionDistance, EveMissileWarhead.#targetPosition) ?? false;
    if (flight < 1 && !hit) return EveMissileWarhead.StateChangeEvent.EVT_NONE;

    vec3.copy(this.explosionPosition, positionNow);
    vec3.subtract(EveMissileWarhead.#impactDirection, EveMissileWarhead.#targetPosition, positionNow);
    if (vec3.dot(EveMissileWarhead.#impactDirection, this.#movement) < 0) vec3.copy(this.explosionPosition, EveMissileWarhead.#targetPosition);
    if (this.impactSize > 0)
    {
      vec3.negate(EveMissileWarhead.#impactDirection, this.#movement);
      target.CreateImpact?.(this.targetLocatorID, EveMissileWarhead.#impactDirection, this.impactDuration, this.impactSize);
    }
    this.#state = EveMissileWarhead.State.STATE_EXPLODED;
    return EveMissileWarhead.StateChangeEvent.EVT_EXPLODE;
  }

  /**
   * Samples the Perlin path offset for the current flight time, advances the
   * base transform, and recomputes the per-frame movement vector that impact
   * direction and orientation depend on; the noise phase is a stable
   * per-instance sequence rather than Carbon's pointer-derived one.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon's pointer-derived Perlin phase is replaced with a stable per-instance 12-bit sequence.")
  Update(context)
  {
    const position = this.#flyingTime * this.pathOffsetNoiseSpeed + this.#noisePhase;
    this.pathOffset[0] = carbonPerlin1D(position, 1.1, 2, 3) * this.pathOffsetNoiseScale;
    this.pathOffset[1] = carbonPerlin1D(position + 10.1, 1.1, 2, 3) * this.pathOffsetNoiseScale;
    this.pathOffset[2] = carbonPerlin1D(position + 18.3, 1.1, 2, 3) * this.pathOffsetNoiseScale;
    vec3.subtract(this.#positionLastFrame, this.#positionLastFrame, context?.GetOriginShift?.() ?? context?.originShift ?? EveMissileWarhead.#zero);
    super.Update(context);
    this.GetWorldPosition(EveMissileWarhead.#positionNow);
    vec3.subtract(this.#movement, EveMissileWarhead.#positionNow, this.#positionLastFrame);
    vec3.copy(this.#positionLastFrame, EveMissileWarhead.#positionNow);
  }

  /**
   * Integrates one frame of flight - eject velocity, inherited ship velocity,
   * start-to-destination interpolation shaped by acceleration, the noise path
   * offset and the bomb falloff - then rebuilds the warhead's offset transform
   * and slerps its orientation toward the direction of travel.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("The CPU flight calculation is source-faithful; current world composition is also published immediately for headless graph consumers.")
  UpdateWarhead(deltaTime, estimatedTotalAliveTime, currentBallVelocity, currentInheritedVelocity, inverseBallRotation, missileTransform, originShift = EveMissileWarhead.#zero)
  {
    const dt = Number(deltaTime) || 0;
    vec3.set(EveMissileWarhead.#ejectVelocity, 0, 0, this.#currentEjectVelocity);
    vec3.transformQuat(EveMissileWarhead.#ejectVelocity, EveMissileWarhead.#ejectVelocity, this.#startOrientation);
    transformNormal(EveMissileWarhead.#globalBallVelocity, currentBallVelocity, inverseBallRotation);
    if (this.#state >= EveMissileWarhead.State.STATE_START_TRACKING) this.#flyingTime += dt;

    const totalFlyingTime = Math.max((Number(estimatedTotalAliveTime) + 0.1) * this.#speedModifier, Number.EPSILON);
    const flight = clamp01(this.#flyingTime / totalFlyingTime);
    const quickFlight = clamp01(3 * flight);
    if (this.#state >= EveMissileWarhead.State.STATE_EJECTING) vec3.scaleAndAdd(this.#currentStartOffset, this.#currentStartOffset, EveMissileWarhead.#ejectVelocity, dt);
    vec3.scaleAndAdd(this.#currentStartOffset, this.#currentStartOffset, currentInheritedVelocity, dt);

    const denominator = totalFlyingTime - this.#finalDestinationTimer;
    const targetTime = denominator ? clamp01((this.#flyingTime - this.#finalDestinationTimer) / denominator) : 1;
    vec3.scale(EveMissileWarhead.#modifiedOldOffset, this.#oldEndOffset, 1 - clamp01(targetTime * 2));
    vec3.lerp(this.#currentEndOffset, EveMissileWarhead.#modifiedOldOffset, this.#endOffset, targetTime);
    vec3.lerp(this.#currentOffset, this.#currentStartOffset, this.#currentEndOffset, Math.pow(flight, 1 + this.acceleration));

    vec3.scale(EveMissileWarhead.#globalBallVelocity, EveMissileWarhead.#globalBallVelocity, 1 - flight);
    vec3.scaleAndAdd(this.#currentStartOffset, this.#currentStartOffset, EveMissileWarhead.#globalBallVelocity, -dt);
    this.#currentEjectVelocity = this.startEjectVelocity * (1 - Math.pow(quickFlight, 1 + this.acceleration));
    vec3.scaleAndAdd(this.#currentOffset, this.#currentOffset, this.pathOffset, Math.sin(Math.PI * flight) ** 2);
    if (this.#bombFlightpath) vec3.scale(this.#currentOffset, this.#currentOffset, (1 - quickFlight) ** 2);

    vec3.transformMat4(EveMissileWarhead.#relativePosition, this.#currentOffset, missileTransform);
    vec3.subtract(EveMissileWarhead.#translation, this.#lastRelativePosition, EveMissileWarhead.#relativePosition);
    vec3.add(EveMissileWarhead.#translation, EveMissileWarhead.#translation, originShift);
    vec3.copy(this.#lastRelativePosition, EveMissileWarhead.#relativePosition);
    if (this.#lastPositionValid && this.startDataValid)
    {
      const distanceSquared = vec3.squaredLength(EveMissileWarhead.#translation);
      if (distanceSquared > 0)
      {
        transformNormal(EveMissileWarhead.#translation, EveMissileWarhead.#translation, inverseBallRotation);
        mat4.arcFromForward(EveMissileWarhead.#orientationMatrix, EveMissileWarhead.#translation);
        mat4.getRotation(EveMissileWarhead.#orientationNow, EveMissileWarhead.#orientationMatrix);
        if (distanceSquared < 1)
        {
          quat.slerp(this.#currentOrientation, this.#currentOrientation, EveMissileWarhead.#orientationNow, distanceSquared);
          quat.normalize(this.#currentOrientation, this.#currentOrientation);
        }
        else quat.copy(this.#currentOrientation, EveMissileWarhead.#orientationNow);
      }
    }
    else this.#lastPositionValid = true;

    mat4.fromRotationTranslation(this.#currentOffsetTransform, this.#currentOrientation, this.#currentOffset);
    mat4.multiply(this.worldTransform, missileTransform, this.#currentOffsetTransform);
  }

  /**
   * Turns the warhead's own particle emitters and those of its children on or
   * off.
   */
  @carbon.method
  @impl.implemented
  EnableParticleEmitting(enable)
  {
    for (const child of this.children) for (const emitter of child?.particleEmitters ?? []) enableEmitter(emitter, enable);
    for (const emitter of this.particleEmitters) enableEmitter(emitter, enable);
  }

  /**
   * Snaps the world transform to the supplied parent transform and runs the base
   * visibility pass; returns false while the warhead is unlaunched, dead or
   * hidden.
   */
  @carbon.method
  @impl.implemented
  UpdateVisibility(context, parentTransform)
  {
    this.#isVisible = false;
    if (!this.startDataValid || this.#state === EveMissileWarhead.State.STATE_DEAD || !this.display) return false;
    mat4.copy(this.worldTransform, parentTransform);
    this.#isVisible = true;
    super.UpdateVisibility(context, parentTransform);
    return true;
  }

  /**
   * Appends the warhead mesh and its sprite set; nothing is appended while the
   * warhead is invisible or at low LOD.
   */
  @carbon.method
  @impl.implemented
  GetRenderables(out = [])
  {
    if (!this.#isVisible || this.lodLevel <= EveTransform.Tr2Lod.TR2_LOD_LOW) return out;
    if (this.mesh) out.push(this);
    this.spriteSet?.GetRenderables?.(out);
    return out;
  }

  /**
   * Writes the world-space sphere enclosing the warhead body, sized and centred
   * from warheadLength.
   */
  @carbon.method
  @impl.implemented
  GetBoundingSphere(out = vec4.create())
  {
    vec4.set(EveMissileWarhead.#localSphere, 0, 0, this.warheadLength * 0.5, this.warheadLength * 0.5);
    sph3.transformMat4(out, EveMissileWarhead.#localSphere, this.worldTransform);
    return true;
  }

  /**
   * Writes the warhead body sphere in the missile's space, which the missile
   * unions into its own bounding sphere.
   */
  @carbon.method
  @impl.implemented
  GetLocalBoundingSphere(out = vec4.create())
  {
    vec4.set(EveMissileWarhead.#localSphere, 0, 0, this.warheadLength * 0.5, this.warheadLength * 0.5);
    sph3.transformMat4(out, EveMissileWarhead.#localSphere, this.#currentOffsetTransform);
    return true;
  }

  /**
   * Returns the warhead's live offset transform relative to the missile; it is
   * the warhead's own matrix and is rewritten by the next flight update.
   */
  @carbon.method
  @impl.implemented
  GetCurrentOffsetTransform()
  {
    return this.#currentOffsetTransform;
  }

  /**
   * Returns the damage locator index this warhead is tracking, or -1 when none
   * has been chosen.
   */
  @carbon.method
  @impl.implemented
  GetTargetLocator()
  {
    return this.targetLocatorID;
  }

  /** Overrides the damage locator index this warhead tracks. */
  @carbon.method
  @impl.implemented
  SetTargetLocator(locator)
  {
    this.targetLocatorID = Number(locator) | 0;
  }

  /** Returns the current flight state, one of EveMissileWarhead.State. */
  @carbon.method
  @impl.implemented
  GetState()
  {
    return this.#state;
  }

  /**
   * Returns the authored warhead id, which the missile passes to the explosion
   * callback.
   */
  @carbon.method
  @impl.implemented
  GetWarheadID()
  {
    return this.id;
  }

  /**
   * Allocates the warhead's per-object record and sets the world transform and
   * the radius/length pair the shader needs; the record carries values only,
   * never GPU resources.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Trinity allocates the catalogued record and encodes its fields into the canonical stored layout; the engine owns GPU allocation, upload, and binding.")
  GetPerObjectData(accumulator)
  {
    const data = accumulator.Alloc("EveMissileWarheadPerObjectData");
    data.SetAndTranspose("world", this.worldTransform);
    data.Set("missileSize", [this.warheadRadius, this.warheadLength, 0, 0]);
    return data;
  }

  static State = State;

  static StateChangeEvent = StateChangeEvent;

  static #nextNoisePhase = 1;
  static #zero = vec3.create();
  static #localSphere = vec4.create();
  static #positionNow = vec3.create();
  static #positionLast = vec3.create();
  static #targetPosition = vec3.create();
  static #impactDirection = vec3.create();
  static #ejectVelocity = vec3.create();
  static #globalBallVelocity = vec3.create();
  static #modifiedOldOffset = vec3.create();
  static #relativePosition = vec3.create();
  static #translation = vec3.create();
  static #orientationNow = quat.create();
  static #orientationMatrix = mat4.create();
}

function clamp01(value)
{
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function transformNormal(out, vector, matrix)
{
  const x = vector?.[0] ?? 0;
  const y = vector?.[1] ?? 0;
  const z = vector?.[2] ?? 0;
  out[0] = matrix[0] * x + matrix[4] * y + matrix[8] * z;
  out[1] = matrix[1] * x + matrix[5] * y + matrix[9] * z;
  out[2] = matrix[2] * x + matrix[6] * y + matrix[10] * z;
  return out;
}

function enableEmitter(emitter, enable)
{
  if (typeof emitter?.Enable === "function") emitter.Enable(!!enable);
  else if (typeof emitter?.SetEnabled === "function") emitter.SetEnabled(!!enable);
  else if (emitter) emitter.enabled = !!enable;
}
