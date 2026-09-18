// Source: blue/include/IBlueOS.h:246-253
//
// The variable-rate tick callback, beside the fixed-rate `IBlueEvents`. It
// takes an elapsed SECONDS delta rather than a second absolute time, which is
// the whole difference: a variable-rate ticker is told how much time passed,
// a fixed-rate one is told what time it is.
import { CjsSchema, compose, impl } from "#schema";

/** `IVariableTicker` - the variable-rate tick callback, per blue/include/IBlueOS.h:246. */
export class IVariableTicker
{
  /**
   * `OnTick` - one pump cycle, with the elapsed time given.
   *
   * @param {number} _timestamp Time since the client started, in 100ns ticks.
   * @param {number} _deltaTSec Seconds elapsed since the previous pump cycle.
   * @param {*} _cookie Whatever the registrant passed when it registered.
   */
  OnTick(_timestamp, _deltaTSec, _cookie) {}
}

CjsSchema.decorateMethod(IVariableTicker, "OnTick", compose.abstract, impl.abstract);
