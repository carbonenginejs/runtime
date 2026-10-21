import { exposure as be } from "#be";
import { IRoot } from "#blue/IRoot";
// Source: audio/src/AudActionLog.h
import { blue } from "#schema";

/** Required logging contract consumed by AudManager. */
@be.interface("IAudActionLog")
@blue.inherit(IRoot)
export class IAudActionLog extends IRoot
{
  /** Records an event post. */
  @blue.abstract
  LogPostEvent(emitterID, playID, eventID, name) {}

  /** Records an action applied to a playing event. */
  @blue.abstract
  LogExecuteActionOnPlayingID(emitterID, playID, action) {}

  /** Records an emitter switch change. */
  @blue.abstract
  LogSetSwitch(emitterID, group, state) {}

  /** Records a global state change. */
  @blue.abstract
  LogSetState(group, state) {}

  /** Records a real-time parameter change. */
  @blue.abstract
  LogSetRTPC(emitterID, name, value, playID = 0) {}

  /** Delivers pending records. */
  @blue.abstract
  Flush() {}
}
