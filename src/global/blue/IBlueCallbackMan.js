import { IRoot } from "./IRoot.js";
// Source: blue/include/IBlueCallbackMan.h
//
// A queue of callbacks run on the callback manager's own threads, or one at a
// time by whoever calls Update. Carbon keeps one global background instance,
// `BeCallbackMan` (ResourceLoading.cpp:24, :81-91), and resMan keeps a second,
// ticked on the main thread (BlueResMan.cpp:107-109).
//
// The implementation is `BlueCallbackMan`; the browser differences it carries
// (workers instead of threads, async entries, a cancel that cannot block) are
// marked there.
import { CjsSchema, blue } from "#schema";

/** `IBlueCallbackMan` - a callback queue, per blue/include/IBlueCallbackMan.h. */
export class IBlueCallbackMan extends IRoot
{
  /** `BCBF_NONE` - no flags (IBlueCallbackMan.h:16). */
  static BCBF_NONE = 0;

  /** `BCBF_URGENT` - queue ahead of every regular entry (IBlueCallbackMan.h:17). */
  static BCBF_URGENT = 1;

  /** `BCBF_FENCE` - run only after every thread has drained what was queued before it (IBlueCallbackMan.h:18). */
  static BCBF_FENCE = 2;

  /**
   * `Add` - queues a callback with its context; urgent entries run before
   * regular ones.
   *
   * @param {Function|string} _callback The callback, or its registered name on worker threads.
   * @param {*} _context Passed to the callback.
   * @param {number} _flags `BCBF_*` flags.
   * @param {{value: number}|null} _id Receives the entry's id, for `Cancel`.
   * @returns {boolean} Whether the entry was queued.
   */
  Add(_callback, _context, _flags, _id) {}

  /**
   * `Cancel` - removes a queued entry; for one in progress, waits for it to
   * finish and discards its outcome.
   *
   * @param {number} _id Entry id from `Add`.
   * @returns {Promise<void>} Settles once the entry is no longer running.
   */
  Cancel(_id) {}

  /** `Run` - starts the manager's own threads, which process entries until stopped. */
  Run() {}

  /** `Pause` - stops the own threads taking new entries until resumed. */
  Pause() {}

  /** `Resume` - undoes one `Pause`. */
  Resume() {}

  /** `IsPaused` - whether a pause is in effect. */
  IsPaused() {}

  /** `Throttle` - called in the run loop; a subclass overrides it to pause when needed. */
  Throttle() {}

  /** `Unthrottle` - called regularly to resume a manager paused by `Throttle`. */
  Unthrottle() {}

  /** `Stop` - stops the own threads started by `Run`. */
  Stop() {}

  /**
   * `Update` - processes the next entry on the calling thread.
   *
   * @returns {boolean} Whether an entry was processed.
   */
  Update() {}

  /** `IsEmpty` - whether no entry is queued or in progress. */
  IsEmpty() {}

  /** `GetNextId` - the id the next `Add` will hand out. */
  GetNextId() {}

  /** `GetSize` - entries queued or in progress. */
  GetSize() {}

  /** `GetTimeInQueueMax` - the longest any entry waited, in seconds, since the last reset. */
  GetTimeInQueueMax() {}

  /** `GetTimeInQueueAverage` - the average wait, in seconds, since the last reset. */
  GetTimeInQueueAverage() {}

  /** `ResetQueueStats` - resets the wait statistics. */
  ResetQueueStats() {}

  /**
   * `SetPriority` - the priority of the own threads.
   *
   * @param {number} _priority `CCP_THREAD_PRIORITY_*`, -2 to 2.
   */
  SetPriority(_priority) {}

  /**
   * `SetThreadCount` - how many threads `Run` creates.
   *
   * @param {number} _count Thread count.
   */
  SetThreadCount(_count) {}

  /**
   * `SetName` - the manager's name, for debugging and profiling.
   *
   * @param {string} _name Name.
   */
  SetName(_name) {}
}

for (const method of [
  "Add", "Cancel", "Run", "Pause", "Resume", "IsPaused", "Throttle", "Unthrottle", "Stop", "Update",
  "IsEmpty", "GetNextId", "GetSize", "GetTimeInQueueMax", "GetTimeInQueueAverage", "ResetQueueStats",
  "SetPriority", "SetThreadCount", "SetName"
])
{
  CjsSchema.decorateMethod(IBlueCallbackMan, method, blue.abstract);
}

CjsSchema.exposure.interface("IBlueCallbackMan")(IBlueCallbackMan);
