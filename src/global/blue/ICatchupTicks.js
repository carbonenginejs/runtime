// Source: blue/include/IBlueOS.h:255-265
//
//     struct ICatchupTicks : public IVariableTicker
//
// A variable-rate ticker that also wants to know when the frame is over.
// Carbon's comment says the inheritance exists "to make CatchupTicks
// compatible with the new ticking code", so the base is the newer of the two.
import { CjsSchema, compose, impl } from "#schema";
import { IVariableTicker } from "./IVariableTicker.js";

/** `ICatchupTicks` - a variable-rate ticker told when the frame ends, per blue/include/IBlueOS.h:256. */
export class ICatchupTicks extends IVariableTicker
{
  /**
   * `OnPostFrameTick` - every tick for this system in this frame has completed.
   *
   * @param {number} _timestamp Time since the client started, in 100ns ticks.
   * @param {*} _cookie Whatever the registrant passed when it registered.
   */
  OnPostFrameTick(_timestamp, _cookie) {}
}

CjsSchema.decorateMethod(ICatchupTicks, "OnPostFrameTick", compose.abstract, impl.abstract);
