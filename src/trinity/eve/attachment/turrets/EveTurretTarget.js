// Source: trinity/trinity/Eve/Turret/EveTurretTarget.h
// Source: trinity/trinity/Eve/Turret/EveTurretTarget.cpp
import { vec3 } from "#math/vec3";
import { CjsModel } from "#model";
import { carbon, impl, io, type } from "#schema";
import { ImpactConfiguration } from "../../../generated/include/enums.js";


/**
 * Tracks what a turret set is shooting at: the chosen damage locator, the
 * resolved impact and miss positions, and the queue of hit/miss results the
 * server has sent.
 */
@type.define({ className: "EveTurretTarget", family: "eve/attachment/turrets" })
export class EveTurretTarget extends CjsModel
{
  @io.read @type.vec3 targetPosition = vec3.create();
  @io.read @type.int32 @type.enum("ImpactBehaviour") behaviour = 0;
  @io.read @type.float32 positionOldInfluence = -1;
  @io.read @type.vec3 position = vec3.create();
  @io.read @type.vec3 positionOld = vec3.create();
  @io.read @type.int32 locator = -1;

  #targetable = null;
  #worldPositionObject = null;
  #impactLength = -1;
  #impactDelay = -1;
  #impactID = -1;
  #positionMiss = vec3.create();
  #missQueue = [];
  #lastShotMissed = false;
  #lastShotTime = 0;
  #laserMissBehaviour = false;
  #projectileMissBehaviour = false;
  #impactSize = 0;
  #randomMissDistanceOffset = 0.5;
  #randomMissPositionOffset = vec3.create();

  /**
   * The targetable record this tracker is following, or null when it has no
   * target.
   */
  @carbon.method @impl.implemented
  GetTargetable()
  {
    return this.#targetable;
  }

  /**
   * Accepts an object as the target only when it exposes both an impact or
   * damage-locator surface and a world-position surface; a change to a different
   * object seeds the position blend so tracking eases off the previous target.
   * Returns whether the object was accepted.
   */
  @carbon.method @impl.adapted
  @impl.reason("Carbon QueryInterface checks are represented by validating the targetable's required duck-typed position surface.")
  SetTargetable(object)
  {
    if (!object) return false;
    const hasTargetSurface = typeof object.GetDamageLocatorPosition === "function" || typeof object.GetImpactPosition === "function";
    const hasPositionSurface = typeof object.GetWorldPosition === "function" || object.worldPosition?.length >= 3 || object.position?.length >= 3;
    if (!(hasTargetSurface && hasPositionSurface)) return false;
    if (object !== this.#targetable)
    {
      this.#targetable = object;
      this.#worldPositionObject = object;
      vec3.copy(this.positionOld, this.position);
      this.positionOldInfluence = 1;
    }
    return true;
  }

  /** The damage locator index currently being fired at, or -1 when not firing. */
  @carbon.method @impl.implemented
  GetLocator()
  {
    return this.locator;
  }

  /**
   * Begins a shot at a locator: rolls this burst's random miss distance and
   * offset, and, when the shot is not a queued miss and an impact size is
   * authored, either creates the impact immediately (zero delay under
   * damage-locator behaviour) or arms it to be created once delay elapses.
   */
  @carbon.method @impl.adapted
  @impl.reason("Carbon's random helpers map to Math.random; targetable calls use the org-standard out-last convention.")
  StartFireAtLocator(locator, delay, length, source = EveTurretTarget.#zero)
  {
    this.locator = Number(locator) | 0;
    this.#randomMissDistanceOffset = Math.random();
    const u = Math.random();
    const v = Math.random();
    const phi = u * Math.PI * 2;
    const theta = Math.acos(1 - Math.sqrt(v)) * 2;
    const sinPhi = Math.sin(phi) * 3;
    vec3.set(this.#randomMissPositionOffset, sinPhi * Math.cos(theta), Math.cos(phi) * 3, sinPhi * Math.sin(theta));
    this.#impactID = -1;

    if (!this.PopShotMissed() && this.#impactSize > 0 && this.#targetable)
    {
      this.#impactLength = Math.max(Number(length), 0);
      this.#impactDelay = Number(delay);
      if (this.#impactDelay === 0)
      {
        this.GetImpactPosition(source, this.targetPosition);
        if (this.behaviour === EveTurretTarget.ImpactBehaviour.DAMAGE_LOCATOR)
        {
          vec3.subtract(EveTurretTarget.#direction, source, this.targetPosition);
          this.#impactID = Number(this.#targetable.CreateImpact?.(this.locator, EveTurretTarget.#direction, this.#impactLength, this.#impactSize) ?? -1) | 0;
          this.#impactDelay = -1;
        }
      }
    }
  }

  /**
   * Ends firing: clears the locator, the position blend, the current miss state
   * and every queued shot result.
   */
  @carbon.method @impl.implemented
  StopFireAtLocator()
  {
    this.locator = -1;
    this.positionOldInfluence = -1;
    this.#lastShotMissed = false;
    this.#missQueue.length = 0;
  }

  /**
   * Resolves the world impact point for the current locator into out according
   * to the impact behaviour - the damage locator, the target's centre, or the
   * target's own shield-ellipsoid solution - falling back to the target's world
   * position when the locator gives no usable or finite position.
   */
  @carbon.method @impl.adapted
  @impl.reason("Targetable output parameters use CarbonEngineJS's out-last calling convention.")
  GetImpactPosition(source = EveTurretTarget.#zero, out = vec3.create())
  {
    if (!this.#targetable) return out;
    if (this.behaviour === EveTurretTarget.ImpactBehaviour.DAMAGE_LOCATOR)
    {
      const valid = this.#targetable.GetDamageLocatorPosition?.(this.locator, true, out);
      if (valid === false || vec3.squaredLength(out) > 2.2379561604e22) getWorldPosition(this.#worldPositionObject, out);
    }
    else if (this.behaviour === EveTurretTarget.ImpactBehaviour.CENTER)
    {
      getWorldPosition(this.#worldPositionObject, out);
    }
    else
    {
      getWorldPosition(this.#worldPositionObject, EveTurretTarget.#worldPosition);
      const valid = this.#targetable.GetImpactPosition?.(this.locator, source, EveTurretTarget.#worldPosition, 0, out);
      if (valid === false) this.#targetable.GetDamageLocatorPosition?.(this.locator, true, out);
    }
    return out;
  }

  /**
   * Advances the target for the frame: recomputes the impact point, extends the
   * miss point far past the target along the miss direction (a fixed 250 km for
   * lasers, distance-relative otherwise), maintains an in-flight impact under
   * damage-locator behaviour, and blends the tracking position out of the
   * previous target. Returns the live position buffer, valid until the next
   * Update.
   */
  @carbon.method @impl.adapted
  @impl.reason("Targetable output parameters use CarbonEngineJS's out-last calling convention.")
  Update(deltaTime, source = EveTurretTarget.#zero)
  {
    const dt = Number(deltaTime) || 0;
    if (this.#targetable)
    {
      this.GetImpactPosition(source, this.targetPosition);
      vec3.subtract(EveTurretTarget.#direction, source, this.targetPosition);
      const missResult = this.#targetable.GetMissPosition?.(this.targetPosition, source, this.#positionMiss);
      if (missResult?.length >= 3) vec3.copy(this.#positionMiss, missResult);
      else if (missResult === undefined && !this.#targetable.GetMissPosition) vec3.copy(this.#positionMiss, this.targetPosition);
      vec3.add(this.#positionMiss, this.#positionMiss, this.#randomMissPositionOffset);
      vec3.subtract(EveTurretTarget.#missDirection, this.#positionMiss, source);
      const distance = vec3.length(EveTurretTarget.#missDirection);
      if (distance) vec3.scale(EveTurretTarget.#missDirection, EveTurretTarget.#missDirection, 1 / distance);
      if (this.#laserMissBehaviour)
      {
        vec3.scaleAndAdd(this.#positionMiss, this.#positionMiss, EveTurretTarget.#missDirection, 250000);
      }
      else
      {
        vec3.scaleAndAdd(this.#positionMiss, this.#positionMiss, EveTurretTarget.#missDirection, (distance + 5000) * (1 + 0.5 * this.#randomMissDistanceOffset));
      }

      if (this.behaviour === EveTurretTarget.ImpactBehaviour.DAMAGE_LOCATOR)
      {
        if (this.#impactID !== -1) this.#targetable.UpdateImpact?.(this.targetPosition, EveTurretTarget.#direction, this.#impactID);
        if (this.#impactDelay > 0 && this.#impactSize > 0)
        {
          this.#impactDelay -= dt;
          if (this.#impactDelay < 0)
          {
            this.#impactID = Number(this.#targetable.CreateImpact?.(this.locator, EveTurretTarget.#direction, this.#impactLength, this.#impactSize) ?? -1) | 0;
            this.#impactDelay = -1;
          }
        }
      }
    }

    vec3.copy(this.position, this.targetPosition);
    if (this.positionOldInfluence > 0)
    {
      vec3.lerp(this.position, this.targetPosition, this.positionOld, this.positionOldInfluence);
      this.positionOldInfluence -= dt;
    }
    return this.position;
  }

  /**
   * The point the turrets aim at - the miss point when the last shot missed,
   * otherwise the blended target position. Copies into out when one is given,
   * otherwise returns the live buffer.
   */
  @carbon.method @impl.implemented
  GetTrackingPosition(out)
  {
    return copyOrReturn(this.GetShotMissed() ? this.#positionMiss : this.position, out);
  }

  /**
   * The point the firing effect terminates at - the miss point when the last
   * shot missed, otherwise the resolved impact point. Copies into out when one
   * is given, otherwise returns the live buffer.
   */
  @carbon.method @impl.implemented
  GetTargetPosition(out)
  {
    return copyOrReturn(this.GetShotMissed() ? this.#positionMiss : this.targetPosition, out);
  }

  /**
   * The index of the target's damage locator nearest source, with its world
   * position written into out; -1 when there is no target or the locator has no
   * position.
   */
  @carbon.method @impl.adapted
  @impl.reason("Targetable output parameters use CarbonEngineJS's out-last calling convention.")
  FindClosestLocator(source, out = vec3.create())
  {
    if (!this.#targetable) return -1;
    const locator = Number(this.#targetable.GetClosestDamageLocatorIndex?.(source) ?? -1) | 0;
    return this.#targetable.GetDamageLocatorPosition?.(locator, true, out) === false ? -1 : locator;
  }

  /**
   * A locator drawn from the target's 'good' set, falling back to the closest
   * one, with its world position written into out; -1 when neither resolves.
   */
  @carbon.method @impl.adapted
  @impl.reason("Targetable output parameters use CarbonEngineJS's out-last calling convention.")
  FindRandomValidLocator(source, out = vec3.create())
  {
    if (!this.#targetable) return -1;
    let locator = Number(this.#targetable.GetGoodDamageLocatorIndex?.(source) ?? -1) | 0;
    if (this.#targetable.GetDamageLocatorPosition?.(locator, true, out) !== false) return locator;
    locator = Number(this.#targetable.GetClosestDamageLocatorIndex?.(source) ?? -1) | 0;
    return this.#targetable.GetDamageLocatorPosition?.(locator, true, out) === false ? -1 : locator;
  }

  /**
   * Sets how misses and impacts are handled: laser versus projectile miss
   * behaviour, the impact size (zero suppresses impacts entirely) and the
   * impact-position behaviour.
   */
  @carbon.method @impl.implemented
  SetBehaviour(laserMiss, projectileMiss, impactSize, impactBehaviour)
  {
    this.#laserMissBehaviour = !!laserMiss;
    this.#projectileMissBehaviour = !!projectileMiss;
    this.#impactSize = Number(impactSize);
    this.behaviour = Number(impactBehaviour) | 0;
  }

  /**
   * Takes the next queued shot result and makes it the current miss state; an
   * empty queue counts as a hit.
   */
  @carbon.method @impl.implemented
  PopShotMissed()
  {
    this.#lastShotMissed = this.#missQueue.length ? this.#missQueue.shift() : false;
    return this.#lastShotMissed;
  }

  /**
   * Whether the most recently popped shot result was a miss, which is what
   * selects the miss position for tracking and targeting.
   */
  @carbon.method @impl.implemented
  GetShotMissed()
  {
    return this.#lastShotMissed;
  }

  /**
   * Queues a hit/miss result for a future shot and stamps the shot time; the queue keeps at most four entries, dropping the oldest.
   * @param {boolean} missed Whether that shot will miss.
   * @param {number} [timestamp] Shot time in seconds; defaults to wall-clock time, and may be supplied for determinism.
   */
  @carbon.method @impl.adapted
  @impl.reason("An optional timestamp supports deterministic tests; otherwise browser wall-clock seconds replace BeOS actual time.")
  SetShotMissed(missed, timestamp = Date.now() / 1000)
  {
    this.#missQueue.push(!!missed);
    this.#lastShotTime = Number(timestamp);
    while (this.#missQueue.length > 4) this.#missQueue.shift();
  }

  /** The timestamp stamped by the most recent SetShotMissed, in seconds. */
  @carbon.method @impl.implemented
  GetLastShotTime()
  {
    return this.#lastShotTime;
  }

  /** The number of queued shot results not yet popped. */
  @carbon.method @impl.implemented
  MissQueueSize()
  {
    return this.#missQueue.length;
  }

  /**
   * The target's radius, which scales the firing effect; -1 when there is no
   * target.
   */
  @carbon.method @impl.implemented
  GetRadius()
  {
    return Number(this.#targetable?.GetRadius?.() ?? -1);
  }

  /**
   * The surface the target currently presents - shield, armor or hull -
   * IMPACT_INVALID when the target does not report one.
   */
  @carbon.method @impl.implemented
  GetImpactConfiguration()
  {
    return this.#targetable?.GetImpactConfiguration?.() ?? EveTurretTarget.ImpactConfiguration.IMPACT_INVALID;
  }

  /**
   * Whether the firing effect should draw its impact end: false only when the
   * shot missed and projectile miss behaviour is set.
   */
  @carbon.method @impl.implemented
  ShowDestObject()
  {
    return !(this.#projectileMissBehaviour && this.GetShotMissed());
  }

  static ImpactBehaviour = Object.freeze({ DAMAGE_LOCATOR: 0, SHIELD_ELLIPSOID: 1, CENTER: 2 });
  static ImpactConfiguration = ImpactConfiguration;
  static #zero = vec3.create();
  static #direction = vec3.create();
  static #missDirection = vec3.create();
  static #worldPosition = vec3.create();
}

function getWorldPosition(object, out)
{
  const value = object?.GetWorldPosition?.(out) ?? object?.worldPosition ?? object?.position;
  if (value?.length >= 3 && value !== out) vec3.copy(out, value);
  return out;
}

function copyOrReturn(value, out)
{
  return out ? vec3.copy(out, value) : value;
}
