import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Include/ITriTargetable.h
import { meta, blue } from "#schema";
import { ImpactConfiguration } from "../generated/include/enums.js";

/**
 * Native contract for an object that weapons aim at and hit: damage locators,
 * miss and impact positions, and impact creation. Carbon maps it on
 * EveSpaceObject2, EveEffectRoot2 and EveRootTransform. Output vectors are the
 * last argument (Carbon passes them first) except UpdateImpact, whose
 * implementers already take the output first.
 */
@blue.define({ className: "ITriTargetable", abstract: true })
export class ITriTargetable extends IRoot
{
  /** Number of damage locators. @returns {number} */
  @blue.abstract
  GetDamageLocatorCount() {}

  /** Index of the damage locator closest to a world position. @param {Float32Array} _position @returns {number} */
  @blue.abstract
  GetClosestDamageLocatorIndex(_position) {}

  /**
   * Writes a damage locator's position.
   * @param {number} _index Locator index.
   * @param {boolean} _inWorldSpace World rather than object space.
   * @param {Float32Array} _out Output position.
   * @returns {boolean} Whether the index named a locator.
   */
  @blue.abstract
  GetDamageLocatorPosition(_index, _inWorldSpace, _out) {}

  /**
   * Writes a damage locator's direction.
   * @param {number} _index Locator index.
   * @param {boolean} _inWorldSpace World rather than object space.
   * @param {Float32Array} _out Output direction.
   * @returns {boolean} Whether the index named a locator.
   */
  @blue.abstract
  GetDamageLocatorDirection(_index, _inWorldSpace, _out) {}

  /**
   * Writes where a shot from source aimed at hit lands when it misses.
   * @param {Float32Array} _hit Aimed position.
   * @param {Float32Array} _source Shot origin.
   * @param {Float32Array} _out Output miss position.
   */
  @blue.abstract
  GetMissPosition(_hit, _source, _out) {}

  /** A randomized well-facing damage locator for a world position. @param {Float32Array} _position @returns {number} */
  @blue.abstract
  GetGoodDamageLocatorIndex(_position) {}

  /** Target radius. @returns {number} */
  @blue.abstract
  GetRadius() {}

  /**
   * Creates an impact effect at a damage locator.
   * @param {number} _damageLocatorIndex Locator index.
   * @param {Float32Array} _direction Impact direction.
   * @param {number} _lifeTime Impact lifetime in seconds.
   * @param {number} _size Impact size.
   * @returns {number} Impact index, or -1.
   */
  @blue.abstract
  CreateImpact(_damageLocatorIndex, _direction, _lifeTime, _size) {}

  /**
   * Updates a live impact's position.
   * @param {Float32Array} _out Output position.
   * @param {Float32Array} _direction Impact direction.
   * @param {number} _impactIndex Impact index from CreateImpact.
   * @returns {boolean} Whether the impact is still live.
   */
  @blue.abstract
  UpdateImpact(_out, _direction, _impactIndex) {}

  /** Carbon's default (ITriTargetable.h:23-26): no impact configuration. @returns {number} */

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
  @blue.abstract
  GetImpactPosition(_locator, _posPrev, _posNow, _epsilon, _out) {}

  /** Whether impacts use the shield ellipsoid. @returns {boolean} */
  @blue.abstract
  HasImpactConfigurationShield() {}

  /** Carbon's default (ITriTargetable.h:32-34) ignores the locator. @param {number} _locator */

  @meta.implemented
  SetLastDamageLocatorHit(_locator)
  {
  }

  static ImpactConfiguration = ImpactConfiguration;
}
