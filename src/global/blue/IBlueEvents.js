// Source: blue/include/IBlueOS.h:229-243
//
//     struct IBlueEvents
//     {
//         virtual void OnTick( Be::Time realTime, Be::Time simTime, void* cookie ) = 0;
//     };
//
// The fixed-rate tick callback. Anything that wants to be driven by Blue's
// pump implements this and hands itself to `RegisterForTicks` with a cookie of
// its own choosing; `TriDevice` registers with the string "Trinity"
// (`TriDevice.cpp:148,310`) and advances the animation clock from `simTime`.
//
// BOTH TIMES ARE "SINCE THE CLIENT STARTED", per the header's own comments on
// the parameters - NOT the Blue UTC values that `GetActualTime` and
// `GetCurrentFrameTime` return. The two bases are easy to confuse and the
// difference is about four centuries.
import { CjsSchema, compose, impl } from "#schema";

/** `IBlueEvents` - the fixed-rate tick callback, per blue/include/IBlueOS.h:229. */
export class IBlueEvents
{
  /**
   * `OnTick` - one pump cycle.
   *
   * @param {number} _realTime Time since the client started, in 100ns ticks.
   * @param {number} _simTime The same, slowed under load to manage it.
   * @param {*} _cookie Whatever the registrant passed to RegisterForTicks.
   */
  OnTick(_realTime, _simTime, _cookie) {}
}

CjsSchema.decorateMethod(IBlueEvents, "OnTick", compose.abstract, impl.abstract);
