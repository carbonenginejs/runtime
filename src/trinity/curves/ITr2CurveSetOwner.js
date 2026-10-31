import { exposure as be } from "#be";
import { IRoot } from "../../global/blueexposure/IRoot.js";
// Source: trinity/trinity/ITr2CurveSetOwner.h:9-19
import { CjsSchema, meta } from "#schema";


/** Contract for an object that plays and queries named curve sets. */
@be.inherit(IRoot)
export class ITr2CurveSetOwner extends IRoot
{
  /**
   * Plays a named curve set and range.
   *
   * @abstract
   * @param {string} _name The curve set name.
   * @param {string} _rangeName The range name.
   * @returns {void}
   */
  PlayCurveSet(_name, _rangeName) {}

  /**
   * Stops a named curve set.
   *
   * @abstract
   * @param {string} _name The curve set name.
   * @returns {void}
   */
  StopCurveSet(_name) {}

  /**
   * Leaves explicit curve-set updates to owners that override this native default.
   *
   * @adapted
   * @param {string} _name The curve set name.
   * @param {number} _time The time supplied by the caller.
   * @returns {void}
   */
  UpdateCurveSet(_name, _time)
  {
  }

  /**
   * Returns the duration of a named curve set.
   *
   * @abstract
   * @param {string} _name The curve set name.
   * @returns {number} The duration reported by the owner.
   */
  GetCurveSetDuration(_name) {}

  /**
   * Returns the duration of a named range in a curve set.
   *
   * @abstract
   * @param {string} _name The curve set name.
   * @param {string} _rangeName The range name.
   * @returns {number} The range duration reported by the owner.
   */
  GetRangeDuration(_name, _rangeName) {}

  /**
   * Leaves starting all curve sets to owners that override this native default.
   *
   * @adapted
   * @returns {void}
   */
  PlayAllCurveSets()
  {
  }

  /**
   * Leaves stopping all curve sets to owners that override this native default.
   *
   * @adapted
   * @returns {void}
   */
  StopAllCurveSets()
  {
  }
}

for (const name of [ "PlayCurveSet", "StopCurveSet", "GetCurveSetDuration", "GetRangeDuration" ])
{
  CjsSchema.decorateMethod(ITr2CurveSetOwner, name, meta.abstract);
}
CjsSchema.exposure.interface("ITr2CurveSetOwner")(ITr2CurveSetOwner);
