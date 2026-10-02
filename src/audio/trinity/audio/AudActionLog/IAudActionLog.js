// Source: audio/src/AudActionLog.h
import { meta } from "#schema";

/** Required logging contract consumed by AudManager. */
@meta.define({ className: "IAudActionLog", family: "audio" })
export class IAudActionLog
{
  /** Records an event post. */
  @meta.blue.method
  @meta.abstract
  LogPostEvent(emitterID, playID, eventID, name)
  {
    throw new Error("IAudActionLog.LogPostEvent must be implemented.");
  }

  /** Records an action applied to a playing event. */
  @meta.blue.method
  @meta.abstract
  LogExecuteActionOnPlayingID(emitterID, playID, action)
  {
    throw new Error("IAudActionLog.LogExecuteActionOnPlayingID must be implemented.");
  }

  /** Records an emitter switch change. */
  @meta.blue.method
  @meta.abstract
  LogSetSwitch(emitterID, group, state)
  {
    throw new Error("IAudActionLog.LogSetSwitch must be implemented.");
  }

  /** Records a global state change. */
  @meta.blue.method
  @meta.abstract
  LogSetState(group, state)
  {
    throw new Error("IAudActionLog.LogSetState must be implemented.");
  }

  /** Records a real-time parameter change. */
  @meta.blue.method
  @meta.abstract
  LogSetRTPC(emitterID, name, value, playID = 0)
  {
    throw new Error("IAudActionLog.LogSetRTPC must be implemented.");
  }

  /** Delivers pending records. */
  @meta.blue.method
  @meta.abstract
  Flush()
  {
    throw new Error("IAudActionLog.Flush must be implemented.");
  }
}
