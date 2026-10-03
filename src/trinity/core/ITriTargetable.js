// Source: trinity/trinity/Include/ITriTargetable.h
import { meta } from "#schema";
import { ImpactConfiguration } from "../generated/include/enums.js";

/**
 * Native contract for an object that weapons aim at and hit: damage locators,
 * miss and impact positions, and impact creation. Carbon maps it on
 * EveSpaceObject2, EveEffectRoot2 and EveRootTransform. Output vectors are the
 * last argument (Carbon passes them first) except UpdateImpact, whose
 * implementers already take the output first.
 */
@meta.define({ className: "ITriTargetable", carbon: "ITriTargetable", family: "trinityCore", abstract: true })
export class ITriTargetable
{
  /** Number of damage locators. @returns {number} */
  @meta.blue.method
  @meta.abstract
  GetDamageLocatorCount()
  {
    throw new Error("ITriTargetable.GetDamageLocatorCount must be implemented by a targetable.");
  }

  /** Index of the damage locator closest to a world position. @param {Float32Array} _position @returns {number} */
  @meta.blue.method
  @meta.abstract
  GetClosestDamageLocatorIndex(_position)
  {
    throw new Error("ITriTargetable.GetClosestDamageLocatorIndex must be implemented by a targetable.");
  }

  /**
   * Writes a damage locator's position.
   * @param {number} _index Locator index.
   * @param {boolean} _inWorldSpace World rather than object space.
   * @param {Float32Array} _out Output position.
   * @returns {boolean} Whether the index named a locator.
   */
  @meta.blue.method
  @meta.abstract
  GetDamageLocatorPosition(_index, _inWorldSpace, _out)
  {
    throw new Error("ITriTargetable.GetDamageLocatorPosition must be implemented by a targetable.");
  }

  /**
   * Writes a damage locator's direction.
   * @param {number} _index Locator index.
   * @param {boolean} _inWorldSpace World rather than object space.
   * @param {Float32Array} _out Output direction.
   * @returns {boolean} Whether the index named a locator.
   */
  @meta.blue.method
  @meta.abstract
  GetDamageLocatorDirection(_index, _inWorldSpace, _out)
  {
    throw new Error("ITriTargetable.GetDamageLocatorDirection must be implemented by a targetable.");
  }

  /**
   * Writes where a shot from source aimed at hit lands when it misses.
   * @param {Float32Array} _hit Aimed position.
   * @param {Float32Array} _source Shot origin.
   * @param {Float32Array} _out Output miss position.
   */
  @meta.blue.method
  @meta.abstract
  GetMissPosition(_hit, _source, _out)
  {
    throw new Error("ITriTargetable.GetMissPosition must be implemented by a targetable.");
  }

  /** A randomized well-facing damage locator for a world position. @param {Float32Array} _position @returns {number} */
  @meta.blue.method
  @meta.abstract
  GetGoodDamageLocatorIndex(_position)
  {
    throw new Error("ITriTargetable.GetGoodDamageLocatorIndex must be implemented by a targetable.");
  }

  /** Target radius. @returns {number} */
  @meta.blue.method
  @meta.abstract
  GetRadius()
  {
    throw new Error("ITriTargetable.GetRadius must be implemented by a targetable.");
  }

  /**
   * Creates an impact effect at a damage locator.
   * @param {number} _damageLocatorIndex Locator index.
   * @param {Float32Array} _direction Impact direction.
   * @param {number} _lifeTime Impact lifetime in seconds.
   * @param {number} _size Impact size.
   * @returns {number} Impact index, or -1.
   */
  @meta.blue.method
  @meta.abstract
  CreateImpact(_damageLocatorIndex, _direction, _lifeTime, _size)
  {
    throw new Error("ITriTargetable.CreateImpact must be implemented by a targetable.");
  }

  /**
   * Updates a live impact's position.
   * @param {Float32Array} _out Output position.
   * @param {Float32Array} _direction Impact direction.
   * @param {number} _impactIndex Impact index from CreateImpact.
   * @returns {boolean} Whether the impact is still live.
   */
  @meta.blue.method
  @meta.abstract
  UpdateImpact(_out, _direction, _impactIndex)
  {
    throw new Error("ITriTargetable.UpdateImpact must be implemented by a targetable.");
  }

  /** Carbon's default (ITriTargetable.h:23-26): no impact configuration. @returns {number} */
  @meta.blue.method
  @meta.implemented
  GetImpactConfiguration()
  {
    return ImpactConfiguration.IMPACT_INVALID;
  }

  /**
   * Resolves where a projectile moving from posPrev to posNow hits.
   * @param {number} _locator Targeted damage locator.
   * @param {Float32Array} _posPrev Previous projectile position.
   * @param {Float32Array} _posNow Current projectile position.
   * @param {number} _epsilon Squared hit distance.
   * @param {Float32Array} _out Output impact position.
   * @returns {boolean} Whether the projectile hit.
   */
  @meta.blue.method
  @meta.abstract
  GetImpactPosition(_locator, _posPrev, _posNow, _epsilon, _out)
  {
    throw new Error("ITriTargetable.GetImpactPosition must be implemented by a targetable.");
  }

  /** Whether impacts use the shield ellipsoid. @returns {boolean} */
  @meta.blue.method
  @meta.abstract
  HasImpactConfigurationShield()
  {
    throw new Error("ITriTargetable.HasImpactConfigurationShield must be implemented by a targetable.");
  }

  /** Carbon's default (ITriTargetable.h:32-34) ignores the locator. @param {number} _locator */
  @meta.blue.method
  @meta.implemented
  SetLastDamageLocatorHit(_locator)
  {
  }

  static ImpactConfiguration = ImpactConfiguration;
}
