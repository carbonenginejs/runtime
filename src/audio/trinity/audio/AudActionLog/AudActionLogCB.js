// Source: audio/src/AudActionLog.h + AudActionLog.cpp
// Hand-owned behavior port. Verify against audio/AudActionLogCB.json and the
// AudActionRecord*.json schema documents.

import { carbon, impl, type } from "#schema";
import { IAudActionLog } from "./IAudActionLog.js";
import { AudActionRecordPostEvent } from "./AudActionRecordPostEvent.js";
import { AudActionRecordExecuteActionOnPlayingID } from "./AudActionRecordExecuteActionOnPlayingID.js";
import { AudActionRecordSetSwitch } from "./AudActionRecordSetSwitch.js";
import { AudActionRecordSetState } from "./AudActionRecordSetState.js";
import { AudActionRecordSetRTPC } from "./AudActionRecordSetRTPC.js";

function Now()
{
  return globalThis.performance?.now() ?? Date.now();
}

/**
 * Queues Carbon-shaped audio action records and flushes them to a registered
 * JavaScript callback during manager processing.
 */
@type.define({ className: "AudActionLogCB", family: "audio" })
export class AudActionLogCB extends IAudActionLog
{

  #callback = null;

  #queue = [];

  /** Carbon method RegisterCallback. Null unregisters without discarding queued records. */
  @carbon.method
  @impl.adapted
  @impl.reason("BlueScriptCallback is represented by a JavaScript function or an object exposing CallVoid(record).")
  RegisterCallback(callback)
  {
    if (callback !== null && callback !== undefined
      && typeof callback !== "function" && typeof callback?.CallVoid !== "function")
    {
      throw new TypeError("AudActionLogCB.RegisterCallback requires a function, CallVoid object, or null.");
    }
    this.#callback = callback ?? null;
  }

  /** Carbon IAudActionLog method LogPostEvent. */
  @carbon.method
  @impl.implemented
  LogPostEvent(emitterID, playID, eventID, name)
  {
    this.#queue.push(new AudActionRecordPostEvent(Now(), emitterID, playID, eventID, name));
  }

  /** Carbon IAudActionLog method LogExecuteActionOnPlayingID. */
  @carbon.method
  @impl.implemented
  LogExecuteActionOnPlayingID(emitterID, playID, action)
  {
    this.#queue.push(new AudActionRecordExecuteActionOnPlayingID(Now(), emitterID, playID, action));
  }

  /** Carbon IAudActionLog method LogSetSwitch. */
  @carbon.method
  @impl.implemented
  LogSetSwitch(emitterID, group, state)
  {
    this.#queue.push(new AudActionRecordSetSwitch(Now(), emitterID, group, state));
  }

  /** Carbon IAudActionLog method LogSetState. */
  @carbon.method
  @impl.implemented
  LogSetState(group, state)
  {
    this.#queue.push(new AudActionRecordSetState(Now(), group, state));
  }

  /** Carbon IAudActionLog method LogSetRTPC. */
  @carbon.method
  @impl.implemented
  LogSetRTPC(emitterID, name, value, playID = 0)
  {
    this.#queue.push(new AudActionRecordSetRTPC(Now(), emitterID, name, value, playID));
  }

  /** Carbon method Flush. Records remain queued until a callback exists. */
  @carbon.method
  @impl.implemented
  Flush()
  {
    while (this.#callback && this.#queue.length)
    {
      const record = this.#queue[0].ToPyObject();
      if (typeof this.#callback === "function")
      {
        this.#callback(record);
      }
      else
      {
        this.#callback.CallVoid(record);
      }
      this.#queue.shift();
    }
  }

}
