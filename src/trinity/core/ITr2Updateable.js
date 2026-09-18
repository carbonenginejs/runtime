// Source: trinity/trinity/Include/ITr2Updateable.h
//
// Carbon's single-method update contract: anything registered with a
// controller's RegisterUpdateable, or placed in TriStepUpdate's object slot,
// answers Update(realTime, simTime). The one method is PURE VIRTUAL - Carbon
// cannot register a non-updateable, which is why the callers that used to
// write `updateable.Update?.()` never needed the hedge.

import { CjsSchema } from "#schema";


/** Contract for an object updated once per controller or render-job tick. */
export class ITr2Updateable
{

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


CjsSchema.define(ITr2Updateable, { className: "ITr2Updateable" });
