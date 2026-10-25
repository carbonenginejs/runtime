// Source: blue/src/BlueThreadMonitor.h
// Source: blue/src/BlueThreadMonitor.cpp
// Source: blue/src/BlueThreadMonitor_Blue.cpp
//
// Carbon keys each status by the calling thread's id (CcpGetCurrentThreadId,
// BlueThreadMonitor.cpp:15-21) behind a mutex. A JavaScript thread is a worker
// with no id, and its work is dispatched from this thread, so the manager that
// owns a worker reports for it, by the worker's name
// (`SetThreadStatus__Thread`). `SetThreadStatus` reports for this thread,
// under `MAIN_THREAD`. One realm needs no mutex.
import { exposure as be } from "#be";
import { CjsSchema, meta } from "#schema";
import { IBlueThreadMonitor } from "./IBlueThreadMonitor.js";

/** `BlueThreadMonitor` - remembers each thread's last reported status. */
export class BlueThreadMonitor extends IBlueThreadMonitor
{
  /** The key `SetThreadStatus` reports this thread under. */
  static MAIN_THREAD = "main";

  /** Each thread's status, by thread name; Carbon's `m_status`. */
  _status = new Map();

  /**
   * `SetThreadStatus` (BlueThreadMonitor.cpp:12-22) - sets this thread's
   * status.
   *
   * Adapted: the thread is named `MAIN_THREAD` rather than identified by id.
   *
   * @param {number} status `BTS_*` status.
   * @returns {number} The previous status, `BTS_IDLE` for a thread not seen before.
   */
  SetThreadStatus(status)
  {
    return this.SetThreadStatus__Thread(BlueThreadMonitor.MAIN_THREAD, status);
  }

  /**
   * `SetThreadStatus` for a named thread: a worker's owner reports for it,
   * because the worker's work is dispatched from this thread.
   *
   * @param {string} thread Thread name.
   * @param {number} status `BTS_*` status.
   * @returns {number} The previous status, `BTS_IDLE` for a thread not seen before.
   */
  SetThreadStatus__Thread(thread, status)
  {
    const previous = this._status.get(thread) ?? IBlueThreadMonitor.BTS_IDLE;
    this._status.set(thread, status);
    return previous;
  }

  /**
   * `GetStatus` (BlueThreadMonitor.cpp:24-37) - every known thread's status.
   *
   * Adapted: each pair carries the thread's name, not a numeric id.
   *
   * @returns {Array<[string, number]>} `[thread, status]` pairs.
   */
  GetStatus()
  {
    return Array.from(this._status, ([ thread, status ]) => [ thread, status ]);
  }
}

CjsSchema.exposure.mapInterface(IBlueThreadMonitor)(BlueThreadMonitor);
CjsSchema.decorateMethod(BlueThreadMonitor, "SetThreadStatus", meta.adapted);
CjsSchema.decorateMethod(BlueThreadMonitor, "GetStatus", be.mapMethodAndWrap(), meta.adapted);
be.define("BlueThreadMonitor")(BlueThreadMonitor);

/**
 * `BeThreadMonitor` (ResourceLoading.cpp:22, :28) - the global thread monitor,
 * registered to Python as `blue.threadMonitor` (:32).
 */
export const BeThreadMonitor = new BlueThreadMonitor();
