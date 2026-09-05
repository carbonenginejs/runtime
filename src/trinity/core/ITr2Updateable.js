// Source: trinity/trinity/Include/ITr2Updateable.h
//
// Carbon's single-method update contract: anything registered with a
// controller's RegisterUpdateable, or placed in TriStepUpdate's object slot,
// answers Update(realTime, simTime). The one method is PURE VIRTUAL - Carbon
// cannot register a non-updateable, which is why the callers that used to
// write `updateable.Update?.()` never needed the hedge.

import { CjsSchema } from "#schema";
import { Adopt, Brand } from "../controllers/ITr2Controller.js";


const ITR2_UPDATEABLE = Symbol.for("carbonenginejs.contract.ITr2Updateable");

const UPDATEABLE_ABSTRACTS = [ "Update" ];


/** Contract for an object updated once per controller or render-job tick. */
export class ITr2Updateable
{
  static [Symbol.hasInstance](value)
  {
    return value !== null && value !== undefined && value[ITR2_UPDATEABLE] === true;
  }

  /**
   * Runs one tick's update.
   *
   * THE ONLY METHOD, AND CARBON MAKES IT PURE VIRTUAL: an updateable exists
   * precisely to be updated, so there is no sensible default.
   *
   * @param {number} _realTime Wall-clock seconds.
   * @param {number} _simTime Sim-clock seconds.
   */
  Update(_realTime, _simTime)
  {
    throw new Error("ITr2Updateable.Update must be implemented by an updateable.");
  }
}


Brand(ITr2Updateable, ITR2_UPDATEABLE, [], UPDATEABLE_ABSTRACTS);
CjsSchema.define(ITr2Updateable, { className: "ITr2Updateable" });


/**
 * Adds the ITr2Updateable contract without replacing an existing model base.
 *
 * @param {Function} Base The class to extend.
 * @returns {Function} A subclass carrying the contract.
 */
export function withITr2Updateable(Base)
{
  const Updateable = Adopt(Base, ITr2Updateable, UPDATEABLE_ABSTRACTS);

  Brand(Updateable, ITR2_UPDATEABLE, [], UPDATEABLE_ABSTRACTS);

  return Updateable;
}
