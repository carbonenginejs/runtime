// Source: blue/include/IBlueOS.h:267-270
//
//     struct ISimTimeRebaseNotify
//     {
//         virtual void OnSimClockRebase( Be::Time oldTime, Be::Time newTime ) = 0;
//     };
//
// Simulation time can be moved, not just slowed: a server sync can shift it.
// Anything holding a simulation timestamp has to be told, or it is holding a
// value from a clock that no longer exists. Registered through
// `RegisterForSimTimeRebase`, which has seven call sites in Carbon.
import { CjsSchema, meta } from "#schema";

/** `ISimTimeRebaseNotify` - told when the simulation clock is moved, per blue/include/IBlueOS.h:267. */
export class ISimTimeRebaseNotify
{
  /**
   * `OnSimClockRebase` - the simulation clock moved from one value to another.
   *
   * @param {number} _oldTime The simulation time before the move, in 100ns ticks.
   * @param {number} _newTime The simulation time after it.
   */
  OnSimClockRebase(_oldTime, _newTime) {}
}

CjsSchema.decorateMethod(ISimTimeRebaseNotify, "OnSimClockRebase", meta.requires, meta.abstract);

CjsSchema.define(ISimTimeRebaseNotify, { className: "ISimTimeRebaseNotify", carbon: "ISimTimeRebaseNotify", family: "blue", fields: {} });
