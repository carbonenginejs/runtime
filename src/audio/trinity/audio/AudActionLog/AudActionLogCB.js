// Source: audio/src/AudActionLog.h + AudActionLog.cpp
// Hand-owned behavior port. Verify against audio/AudActionLogCB.json and the
// AudActionRecord*.json schema documents.

import { meta, blue } from "#schema";
import { blue as be, CjsScriptCallback } from "#blue";
import { IAudActionLog } from "./IAudActionLog.js";
import { AudActionRecordPostEvent } from "./AudActionRecordPostEvent.js";
import { AudActionRecordExecuteActionOnPlayingID } from "./AudActionRecordExecuteActionOnPlayingID.js";
import { AudActionRecordSetSwitch } from "./AudActionRecordSetSwitch.js";
import { AudActionRecordSetState } from "./AudActionRecordSetState.js";
import { AudActionRecordSetRTPC } from "./AudActionRecordSetRTPC.js";

/**
 * Queues Carbon-shaped audio action records and flushes them to a registered
 * JavaScript callback during manager processing.
 */
@blue.define("AudActionLogCB")
@blue.interface(IAudActionLog)
export class AudActionLogCB extends IAudActionLog
{

  _callback = null;

  _queue = [];

  /**
   * Registers the callback used by Flush; null unregisters without clearing records.
   *
   * Carbon stores a BlueScriptCallback (audio/src/AudActionLog.cpp:131-134); a
   * function is wrapped at the boundary (CjsScriptCallback.from), anything else
   * throws, and undefined also unregisters the callback.
   *
   * @param {Function|CjsScriptCallback|null|undefined} callback Record recipient.
   * @returns {void}
   * @throws {TypeError} If the callback cannot be invoked.
   */
  @blue.method
  @meta.adapted
  RegisterCallback(callback)
  {
    this._callback = CjsScriptCallback.from(callback);
  }

  /**
   * Queues one event-post record.
   *
   * Records are stamped with BeOS->GetActualTime() (audio/src/AudActionLog.cpp:88-116).
   * Adapted: the JavaScript queue has no native mutex.
   *
   * @param {number} emitterID Emitter identifier.
   * @param {number} playID Playing identifier.
   * @param {number} eventID Event identifier.
   * @param {string} name Event name.
   * @returns {void}
   */
  @blue.method
  @meta.adapted
  LogPostEvent(emitterID, playID, eventID, name)
  {
    this._queue.push(new AudActionRecordPostEvent(be.os.GetActualTime(), emitterID, playID, eventID, name));
  }

  /**
   * Queues one action on a playing event.
   *
   * Records are stamped with BeOS->GetActualTime() (audio/src/AudActionLog.cpp:88-116).
   * Adapted: the JavaScript queue has no native mutex.
   *
   * @param {number} emitterID Emitter identifier.
   * @param {number} playID Playing identifier.
   * @param {string} action Action name.
   * @returns {void}
   */
  @blue.method
  @meta.adapted
  LogExecuteActionOnPlayingID(emitterID, playID, action)
  {
    this._queue.push(new AudActionRecordExecuteActionOnPlayingID(be.os.GetActualTime(), emitterID, playID, action));
  }

  /**
   * Queues one emitter switch change.
   *
   * Records are stamped with BeOS->GetActualTime() (audio/src/AudActionLog.cpp:88-116).
   * Adapted: the JavaScript queue has no native mutex.
   *
   * @param {number} emitterID Emitter identifier.
   * @param {string} group Switch group.
   * @param {string} state Selected state.
   * @returns {void}
   */
  @blue.method
  @meta.adapted
  LogSetSwitch(emitterID, group, state)
  {
    this._queue.push(new AudActionRecordSetSwitch(be.os.GetActualTime(), emitterID, group, state));
  }

  /**
   * Queues one global state change.
   *
   * Records are stamped with BeOS->GetActualTime() (audio/src/AudActionLog.cpp:88-116).
   * Adapted: the JavaScript queue has no native mutex.
   *
   * @param {string} group State group.
   * @param {string} state Selected state.
   * @returns {void}
   */
  @blue.method
  @meta.adapted
  LogSetState(group, state)
  {
    this._queue.push(new AudActionRecordSetState(be.os.GetActualTime(), group, state));
  }

  /**
   * Queues one real-time parameter change.
   *
   * Records are stamped with BeOS->GetActualTime() (audio/src/AudActionLog.cpp:88-116).
   * Adapted: the JavaScript queue has no native mutex.
   *
   * @param {number} emitterID Emitter identifier.
   * @param {string} name Parameter name.
   * @param {number} value Parameter value.
   * @param {number} [playID=0] Playing identifier.
   * @returns {void}
   */
  @blue.method
  @meta.adapted
  LogSetRTPC(emitterID, name, value, playID = 0)
  {
    this._queue.push(new AudActionRecordSetRTPC(be.os.GetActualTime(), emitterID, name, value, playID));
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
  @blue.method
  @meta.adapted
  Flush()
  {
    while (this._callback && this._queue.length)
    {
      const record = this._queue[0].ToPyObject();
      this._callback.CallVoid(record);
      this._queue.shift();
    }
  }

}
