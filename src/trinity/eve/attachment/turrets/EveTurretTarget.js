// Source: trinity/trinity/Eve/Turret/EveTurretTarget.h
// Source: trinity/trinity/Eve/Turret/EveTurretTarget.cpp
import { vec3 } from "#math/vec3";
import { carbon, impl, edit, type } from "#schema";
import { ImpactConfiguration } from "../../../generated/include/enums.js";
import { blue } from "#blue";


/**
 * Maximum firing-time offset between turrets; godma reads it back through
 * GetShotTimeVariance as the window grouping shots into one damage message
 * (Carbon EveTurretTarget.h:9-11, moved from EveTurretSet.h in trinity 89f5a177).
 */
export const EVE_TURRET_RANDOM_DELAY_MAX = 0.6;


/**
 * Tracks what a turret set is shooting at: the chosen damage locator, the
 * resolved impact and miss positions, and the queue of hit/miss results the
 * server has sent.
 */
@type.define({ className: "EveTurretTarget", family: "eve/attachment/turrets" })
export class EveTurretTarget
{
  @edit.read @type.vec3 targetPosition = vec3.create();
  @edit.read @type.int32 @type.enum("trinity.ImpactBehaviour") behaviour = 0;
  @edit.read @type.float32 positionOldInfluence = -1;
  @edit.read @type.vec3 position = vec3.create();
  @edit.read @type.vec3 positionOld = vec3.create();
  @edit.read @type.int32 locator = -1;

  _targetable = null;
  _worldPositionObject = null;
  _impactLength = -1;
  _impactDelay = -1;
  _impactID = -1;
  _positionMiss = vec3.create();
  _missQueue = [];
  _lastShotMissed = false;
  _lastShotTime = 0;
  _laserMissBehaviour = false;
  _projectileMissBehaviour = false;
  _impactSize = 0;
  _randomMissDistanceOffset = 0.5;
  _randomMissPositionOffset = vec3.create();

  // Carbon m_fadeOnLocatorChange (EveTurretTarget.h:92) - default off; only
  // EveChildTurret enables it, so ship turrets keep the snap behaviour.
  _fadeOnLocatorChange = false;

  /**
   * The targetable record this tracker is following, or null when it has no
   * target.
   */
  @carbon.method @impl.implemented
  GetTargetable()
  {
    return this._targetable;
  }

  /**
   * Accepts an object as the target only when it exposes both an impact or
   * damage-locator surface and a world-position surface; a change to a different
   * object seeds the position blend so tracking eases off the previous target.
   * Null clears the target (Carbon EveTurretTarget.cpp:62-67). Returns whether
   * the object was accepted.
   */
  @carbon.method @impl.adapted
  @impl.reason("Carbon QueryInterface checks are represented by validating the targetable's required duck-typed position surface.")
  SetTargetable(object)
  {
    if (!object)
    {
      this._targetable = null;
      this._worldPositionObject = null;
      return true;
    }
    const hasTargetSurface = typeof object.GetDamageLocatorPosition === "function" || typeof object.GetImpactPosition === "function";
    const hasPositionSurface = typeof object.GetWorldPosition === "function" || object.worldPosition?.length >= 3 || object.position?.length >= 3;
    if (!(hasTargetSurface && hasPositionSurface)) return false;
    if (object !== this._targetable)
    {
      this._targetable = object;
      this._worldPositionObject = object;
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
   * Smooths the aim over locator changes instead of snapping (Carbon
   * EveTurretTarget.cpp:104-111): firing at or leaving a locator seeds the
   * position blend from the current tracking position.
   */
  @carbon.method @impl.implemented
  SetFadeOnLocatorChange(fade)
  {
    this._fadeOnLocatorChange = !!fade;
  }

  /**
   * Begins a shot at a locator: rolls this burst's random miss distance and
   * offset, and, when the shot is not a queued miss and an impact size is
   * authored, either creates the impact immediately (zero delay under
   * damage-locator behaviour) or arms it to be created once delay elapses.
   */
  @carbon.method @impl.adapted
  @impl.reason("Carbon's random helpers map to Math.random; targetable calls use the org-standard out-last convention.")
  StartFireAtLocator(locator, delay, length, source = EveTurretTarget._zero)
  {
    this.locator = Number(locator) | 0;
    // Carbon EveTurretTarget.cpp:122-126: fading turrets blend out of the
    // CURRENT tracking position when the locator changes.
    if (this._fadeOnLocatorChange)
    {
      vec3.copy(this.positionOld, this.position);
      this.positionOldInfluence = 1;
    }
    this._randomMissDistanceOffset = Math.random();
    const u = Math.random();
    const v = Math.random();
    const phi = u * Math.PI * 2;
    const theta = Math.acos(1 - Math.sqrt(v)) * 2;
    const sinPhi = Math.sin(phi) * 3;
    vec3.set(this._randomMissPositionOffset, sinPhi * Math.cos(theta), Math.cos(phi) * 3, sinPhi * Math.sin(theta));
    this._impactID = -1;

    if (!this.PopShotMissed() && this._impactSize > 0 && this._targetable)
    {
      this._impactLength = Math.max(Number(length), 0);
      this._impactDelay = Number(delay);
      if (this._impactDelay === 0)
      {
        this.GetImpactPosition(source, this.targetPosition);
        if (this.behaviour === EveTurretTarget.ImpactBehaviour.DAMAGE_LOCATOR)
        {
          vec3.subtract(EveTurretTarget._direction, source, this.targetPosition);
          this._impactID = Number(this._targetable.CreateImpact?.(this.locator, EveTurretTarget._direction, this._impactLength, this._impactSize) ?? -1) | 0;
          this._impactDelay = -1;
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
    // Carbon EveTurretTarget.cpp:172-180: fading turrets ease out of the
    // last tracking position; others snap by disabling the blend.
    if (this._fadeOnLocatorChange)
    {
      vec3.copy(this.positionOld, this.position);
      this.positionOldInfluence = 1;
    }
    else
    {
      this.positionOldInfluence = -1;
    }
    this._lastShotMissed = false;
    this._missQueue.length = 0;
  }

  /**
   * Resolves the world impact point for the current locator into out according
   * to the impact behaviour - the damage locator, the target's centre, or the
   * target's own shield-ellipsoid solution - falling back to the target's world
   * position when the locator gives no usable or finite position.
   */
  @carbon.method @impl.adapted
  @impl.reason("Targetable output parameters use CarbonEngineJS's out-last calling convention.")
  GetImpactPosition(source = EveTurretTarget._zero, out = vec3.create())
  {
    if (!this._targetable) return out;
    if (this.behaviour === EveTurretTarget.ImpactBehaviour.DAMAGE_LOCATOR)
    {
      const valid = this._targetable.GetDamageLocatorPosition?.(this.locator, true, out);
      if (valid === false || vec3.squaredLength(out) > 2.2379561604e22) getWorldPosition(this._worldPositionObject, out);
    }
    else if (this.behaviour === EveTurretTarget.ImpactBehaviour.CENTER)
    {
      getWorldPosition(this._worldPositionObject, out);
    }
    else
    {
      getWorldPosition(this._worldPositionObject, EveTurretTarget._worldPosition);
      const valid = this._targetable.GetImpactPosition?.(this.locator, source, EveTurretTarget._worldPosition, 0, out);
      if (valid === false) this._targetable.GetDamageLocatorPosition?.(this.locator, true, out);
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
  Update(deltaTime, source = EveTurretTarget._zero)
  {
    const dt = Number(deltaTime) || 0;
    if (this._targetable)
    {
      this.GetImpactPosition(source, this.targetPosition);
      vec3.subtract(EveTurretTarget._direction, source, this.targetPosition);
      const missResult = this._targetable.GetMissPosition?.(this.targetPosition, source, this._positionMiss);
      if (missResult?.length >= 3) vec3.copy(this._positionMiss, missResult);
      else if (missResult === undefined && !this._targetable.GetMissPosition) vec3.copy(this._positionMiss, this.targetPosition);
      vec3.add(this._positionMiss, this._positionMiss, this._randomMissPositionOffset);
      vec3.subtract(EveTurretTarget._missDirection, this._positionMiss, source);
      const distance = vec3.length(EveTurretTarget._missDirection);
      if (distance) vec3.scale(EveTurretTarget._missDirection, EveTurretTarget._missDirection, 1 / distance);
      if (this._laserMissBehaviour)
      {
        vec3.scaleAndAdd(this._positionMiss, this._positionMiss, EveTurretTarget._missDirection, 250000);
      }
      else
      {
        vec3.scaleAndAdd(this._positionMiss, this._positionMiss, EveTurretTarget._missDirection, (distance + 5000) * (1 + 0.5 * this._randomMissDistanceOffset));
      }

      if (this.behaviour === EveTurretTarget.ImpactBehaviour.DAMAGE_LOCATOR)
      {
        if (this._impactID !== -1) this._targetable.UpdateImpact?.(this.targetPosition, EveTurretTarget._direction, this._impactID);
        if (this._impactDelay > 0 && this._impactSize > 0)
        {
          this._impactDelay -= dt;
          if (this._impactDelay < 0)
          {
            this._impactID = Number(this._targetable.CreateImpact?.(this.locator, EveTurretTarget._direction, this._impactLength, this._impactSize) ?? -1) | 0;
            this._impactDelay = -1;
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
    return copyOrReturn(this.GetShotMissed() ? this._positionMiss : this.position, out);
  }

  /**
   * The point the firing effect terminates at - the miss point when the last
   * shot missed, otherwise the resolved impact point. Copies into out when one
   * is given, otherwise returns the live buffer.
   */
  @carbon.method @impl.implemented
  GetTargetPosition(out)
  {
    return copyOrReturn(this.GetShotMissed() ? this._positionMiss : this.targetPosition, out);
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
    if (!this._targetable) return -1;
    const locator = Number(this._targetable.GetClosestDamageLocatorIndex?.(source) ?? -1) | 0;
    return this._targetable.GetDamageLocatorPosition?.(locator, true, out) === false ? -1 : locator;
  }

  /**
   * A locator drawn from the target's 'good' set, falling back to the closest
   * one, with its world position written into out; -1 when neither resolves.
   */
  @carbon.method @impl.adapted
  @impl.reason("Targetable output parameters use CarbonEngineJS's out-last calling convention.")
  FindRandomValidLocator(source, out = vec3.create())
  {
    if (!this._targetable) return -1;
    let locator = Number(this._targetable.GetGoodDamageLocatorIndex?.(source) ?? -1) | 0;
    if (this._targetable.GetDamageLocatorPosition?.(locator, true, out) !== false) return locator;
    locator = Number(this._targetable.GetClosestDamageLocatorIndex?.(source) ?? -1) | 0;
    return this._targetable.GetDamageLocatorPosition?.(locator, true, out) === false ? -1 : locator;
  }

  /**
   * Sets how misses and impacts are handled: laser versus projectile miss
   * behaviour, the impact size (zero suppresses impacts entirely) and the
   * impact-position behaviour.
   */
  @carbon.method @impl.implemented
  SetBehaviour(laserMiss, projectileMiss, impactSize, impactBehaviour)
  {
    this._laserMissBehaviour = !!laserMiss;
    this._projectileMissBehaviour = !!projectileMiss;
    this.SetImpactBehaviour(impactSize, impactBehaviour);
  }

  /**
   * Sets only the impact configuration, leaving miss behaviour untouched
   * (Carbon EveTurretTarget.cpp:371-375, split out for EveChildTurret).
   */
  @carbon.method @impl.implemented
  SetImpactBehaviour(impactSize, impactBehaviour)
  {
    this._impactSize = Number(impactSize);
    this.behaviour = Number(impactBehaviour) | 0;
  }

  /**
   * Takes the next queued shot result and makes it the current miss state; an
   * empty queue counts as a hit.
   */
  @carbon.method @impl.implemented
  PopShotMissed()
  {
    this._lastShotMissed = this._missQueue.length ? this._missQueue.shift() : false;
    return this._lastShotMissed;
  }

  /**
   * Whether the most recently popped shot result was a miss, which is what
   * selects the miss position for tracking and targeting.
   */
  @carbon.method @impl.implemented
  GetShotMissed()
  {
    return this._lastShotMissed;
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
    this._missQueue.push(!!missed);
    this._lastShotTime = Number(timestamp);
    while (this._missQueue.length > 4) this._missQueue.shift();
  }

  /** The timestamp stamped by the most recent SetShotMissed, in seconds. */
  @carbon.method @impl.implemented
  GetLastShotTime()
  {
    return this._lastShotTime;
  }

  /** The number of queued shot results not yet popped. */
  @carbon.method @impl.implemented
  MissQueueSize()
  {
    return this._missQueue.length;
  }

  /** The maximum firing-time variance between turrets (Carbon EveTurretTarget.h:62-65). */
  @carbon.method @impl.implemented
  GetShotTimeVariance()
  {
    return EVE_TURRET_RANDOM_DELAY_MAX;
  }

  /**
   * The target's radius, which scales the firing effect; -1 when there is no
   * target.
   */
  @carbon.method @impl.implemented
  GetRadius()
  {
    return Number(this._targetable?.GetRadius?.() ?? -1);
  }

  /**
   * The surface the target currently presents - shield, armor or hull -
   * IMPACT_INVALID when the target does not report one.
   */
  @carbon.method @impl.implemented
  GetImpactConfiguration()
  {
    return this._targetable?.GetImpactConfiguration?.() ?? EveTurretTarget.ImpactConfiguration.IMPACT_INVALID;
  }

  /**
   * Whether the firing effect should draw its impact end: false only when the
   * shot missed and projectile miss behaviour is set.
   */
  @carbon.method @impl.implemented
  ShowDestObject()
  {
    return !(this._projectileMissBehaviour && this.GetShotMissed());
  }

  static ImpactBehaviour = Object.freeze({ DAMAGE_LOCATOR: 0, SHIELD_ELLIPSOID: 1, CENTER: 2 });
  static ImpactConfiguration = ImpactConfiguration;
  static _zero = vec3.create();
  static _direction = vec3.create();
  static _missDirection = vec3.create();
  static _worldPosition = vec3.create();
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

// Carbon gives this a chooser (trinity/trinity/Eve/Turret/EveTurretSet_Blue.cpp:34) but never registers it,
// so it takes no exposure.
blue.enums.RegisterEnum("trinity.ImpactBehaviour", EveTurretTarget.ImpactBehaviour, {
  source: "trinity/trinity/Eve/Turret/EveTurretTarget.h", family: "eve/attachment/turrets", line: 13,
  chooserSource: "trinity/trinity/Eve/Turret/EveTurretSet_Blue.cpp:34",
  chooser: [
    { name: "DAMAGE_LOCATOR", value: EveTurretTarget.ImpactBehaviour.DAMAGE_LOCATOR, description: "" },
    { name: "SHIELD_ELLIPSOID", value: EveTurretTarget.ImpactBehaviour.SHIELD_ELLIPSOID, description: "" },
    { name: "CENTER", value: EveTurretTarget.ImpactBehaviour.CENTER, description: "" }
  ]
});
