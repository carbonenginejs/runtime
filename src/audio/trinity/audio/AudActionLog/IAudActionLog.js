// Source: audio/src/AudActionLog.h
import { carbon, impl, type } from "#schema";
import { CjsModel } from "#model";

/** Required logging contract consumed by AudManager. */
@type.define({ className: "IAudActionLog", family: "audio" })
export class IAudActionLog extends CjsModel
{
  /** Records an event post. */
  @carbon.method
  @impl.abstract
  LogPostEvent(emitterID, playID, eventID, name)
  {
    throw new Error("IAudActionLog.LogPostEvent must be implemented.");
  }

  /** Records an action applied to a playing event. */
  @carbon.method
  @impl.abstract
  LogExecuteActionOnPlayingID(emitterID, playID, action)
  {
    throw new Error("IAudActionLog.LogExecuteActionOnPlayingID must be implemented.");
  }

  /** Records an emitter switch change. */
  @carbon.method
  @impl.abstract
  LogSetSwitch(emitterID, group, state)
  {
    throw new Error("IAudActionLog.LogSetSwitch must be implemented.");
  }

  /** Records a global state change. */
  @carbon.method
  @impl.abstract
  LogSetState(group, state)
  {
    throw new Error("IAudActionLog.LogSetState must be implemented.");
  }

  /** Records a real-time parameter change. */
  @carbon.method
  @impl.abstract
  LogSetRTPC(emitterID, name, value, playID = 0)
  {
    throw new Error("IAudActionLog.LogSetRTPC must be implemented.");
  }

  /** Delivers pending records. */
  @carbon.method
  @impl.abstract
  Flush()
  {
    throw new Error("IAudActionLog.Flush must be implemented.");
  }
}
