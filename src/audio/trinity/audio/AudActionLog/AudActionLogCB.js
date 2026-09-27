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

  /**
   * Registers the callback used by Flush; null unregisters without clearing records.
   *
   * Adapted: A JavaScript function or CallVoid object replaces BlueScriptCallback
   * (audio/src/AudActionLog.cpp:131-134). Invalid input throws; undefined also
   * unregisters the callback.
   *
   * @param {Function|{CallVoid: Function}|null|undefined} callback Record recipient.
   * @returns {void}
   * @throws {TypeError} If the callback cannot be invoked.
   */
  @carbon.method
  @impl.adapted
  RegisterCallback(callback)
  {
    if (callback !== null && callback !== undefined
      && typeof callback !== "function" && typeof callback?.CallVoid !== "function")
    {
      throw new TypeError("AudActionLogCB.RegisterCallback requires a function, CallVoid object, or null.");
    }
    this.#callback = callback ?? null;
  }

  /**
   * Queues one event-post record.
   *
   * Adapted: The realm-local queue uses performance.now() milliseconds, falling
   * back to Date.now(), instead of Carbon's BeOS->GetActualTime() timestamp
   * (audio/src/AudActionLog.cpp:88-116). The JavaScript queue has no native mutex.
   *
   * @param {number} emitterID Emitter identifier.
   * @param {number} playID Playing identifier.
   * @param {number} eventID Event identifier.
   * @param {string} name Event name.
   * @returns {void}
   */
  @carbon.method
  @impl.adapted
  LogPostEvent(emitterID, playID, eventID, name)
  {
    this.#queue.push(new AudActionRecordPostEvent(Now(), emitterID, playID, eventID, name));
  }

  /**
   * Queues one action on a playing event.
   *
   * Adapted: The realm-local queue uses performance.now() milliseconds, falling
   * back to Date.now(), instead of Carbon's BeOS->GetActualTime() timestamp
   * (audio/src/AudActionLog.cpp:88-116). The JavaScript queue has no native mutex.
   *
   * @param {number} emitterID Emitter identifier.
   * @param {number} playID Playing identifier.
   * @param {string} action Action name.
   * @returns {void}
   */
  @carbon.method
  @impl.adapted
  LogExecuteActionOnPlayingID(emitterID, playID, action)
  {
    this.#queue.push(new AudActionRecordExecuteActionOnPlayingID(Now(), emitterID, playID, action));
  }

  /**
   * Queues one emitter switch change.
   *
   * Adapted: The realm-local queue uses performance.now() milliseconds, falling
   * back to Date.now(), instead of Carbon's BeOS->GetActualTime() timestamp
   * (audio/src/AudActionLog.cpp:88-116). The JavaScript queue has no native mutex.
   *
   * @param {number} emitterID Emitter identifier.
   * @param {string} group Switch group.
   * @param {string} state Selected state.
   * @returns {void}
   */
  @carbon.method
  @impl.adapted
  LogSetSwitch(emitterID, group, state)
  {
    this.#queue.push(new AudActionRecordSetSwitch(Now(), emitterID, group, state));
  }

  /**
   * Queues one global state change.
   *
   * Adapted: The realm-local queue uses performance.now() milliseconds, falling
   * back to Date.now(), instead of Carbon's BeOS->GetActualTime() timestamp
   * (audio/src/AudActionLog.cpp:88-116). The JavaScript queue has no native mutex.
   *
   * @param {string} group State group.
   * @param {string} state Selected state.
   * @returns {void}
   */
  @carbon.method
  @impl.adapted
  LogSetState(group, state)
  {
    this.#queue.push(new AudActionRecordSetState(Now(), group, state));
  }

  /**
   * Queues one real-time parameter change.
   *
   * Adapted: The realm-local queue uses performance.now() milliseconds, falling
   * back to Date.now(), instead of Carbon's BeOS->GetActualTime() timestamp
   * (audio/src/AudActionLog.cpp:88-116). The JavaScript queue has no native mutex.
   *
   * @param {number} emitterID Emitter identifier.
   * @param {string} name Parameter name.
   * @param {number} value Parameter value.
   * @param {number} [playID=0] Playing identifier.
   * @returns {void}
   */
  @carbon.method
  @impl.adapted
  LogSetRTPC(emitterID, name, value, playID = 0)
  {
    this.#queue.push(new AudActionRecordSetRTPC(Now(), emitterID, name, value, playID));
  }

  /**
   * Delivers queued records in order while a callback remains registered.
   *
   * Adapted: JavaScript callbacks receive arrays instead of Python tuples and
   * exceptions propagate. A throwing callback leaves its record at the queue
   * head; Carbon does not branch on callback status and removes that record
   * (audio/src/AudActionLog.cpp:118-129). No callback leaves records queued.
   *
   * @returns {void}
   * @throws {*} Propagates callback exceptions without removing the current record.
   */
  @carbon.method
  @impl.adapted
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
