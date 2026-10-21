import { exposure as be } from "#be";
import { IRoot } from "#blue/IRoot";
// Source: audio/src/AudActionLog.h
import { blue } from "#schema";

/** Required logging contract consumed by AudManager. */
@be.interface("IAudActionLog")
@be.inherit(IRoot)
export class IAudActionLog extends IRoot
{
  /** Records an event post. */
  @be.abstract
  LogPostEvent(emitterID, playID, eventID, name) {}

  /** Records an action applied to a playing event. */
  @be.abstract
  LogExecuteActionOnPlayingID(emitterID, playID, action) {}

  /** Records an emitter switch change. */
  @be.abstract
  LogSetSwitch(emitterID, group, state) {}

  /** Records a global state change. */
  @be.abstract
  LogSetState(group, state) {}

  /** Records a real-time parameter change. */
  @be.abstract
  LogSetRTPC(emitterID, name, value, playID = 0) {}

  /** Delivers pending records. */
  @be.abstract
  Flush() {}
}
