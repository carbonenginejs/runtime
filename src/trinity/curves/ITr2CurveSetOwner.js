// Source: trinity/trinity/ITr2CurveSetOwner.h:9-19
import { CjsSchema, meta } from "#schema";


/** Contract for an object that plays and queries named curve sets. */
export class ITr2CurveSetOwner
{
  /**
   * Plays a named curve set and range.
   * @param {string} _name The curve set name.
   * @param {string} _rangeName The range name.
   * @returns {void}
   */
  PlayCurveSet(_name, _rangeName)
  {
    throw new Error("ITr2CurveSetOwner.PlayCurveSet must be implemented by a curve-set owner.");
  }

  /**
   * Stops a named curve set.
   * @param {string} _name The curve set name.
   * @returns {void}
   */
  StopCurveSet(_name)
  {
    throw new Error("ITr2CurveSetOwner.StopCurveSet must be implemented by a curve-set owner.");
  }

  /**
   * Leaves explicit curve-set updates to owners that override this native default.
   * @param {string} _name The curve set name.
   * @param {number} _time The time supplied by the caller.
   * @returns {void}
   */
  UpdateCurveSet(_name, _time)
  {
  }

  /**
   * Returns the duration of a named curve set.
   * @param {string} _name The curve set name.
   * @returns {number} The duration reported by the owner.
   */
  GetCurveSetDuration(_name)
  {
    throw new Error("ITr2CurveSetOwner.GetCurveSetDuration must be implemented by a curve-set owner.");
  }

  /**
   * Returns the duration of a named range in a curve set.
   * @param {string} _name The curve set name.
   * @param {string} _rangeName The range name.
   * @returns {number} The range duration reported by the owner.
   */
  GetRangeDuration(_name, _rangeName)
  {
    throw new Error("ITr2CurveSetOwner.GetRangeDuration must be implemented by a curve-set owner.");
  }

  /**
   * Leaves starting all curve sets to owners that override this native default.
   * @returns {void}
   */
  PlayAllCurveSets()
  {
  }

  /**
   * Leaves stopping all curve sets to owners that override this native default.
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
for (const name of [ "UpdateCurveSet", "PlayAllCurveSets", "StopAllCurveSets" ])
{
  CjsSchema.decorateMethod(ITr2CurveSetOwner, name, meta.noop);
}
CjsSchema.define(ITr2CurveSetOwner, { className: "ITr2CurveSetOwner" });
