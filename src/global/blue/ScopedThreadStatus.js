// Source: blue/include/IBlueThreadMonitor.h:23-40
//
// Sets this thread's status for a scope and restores the previous one when
// the scope ends. Carbon restores it in the destructor; JavaScript has no
// destructors, so the owner calls `Destruct`, normally in a `finally`.
import { CjsSchema } from "#schema";
import { BeThreadMonitor } from "./BlueThreadMonitor.js";

/** `ScopedThreadStatus` - this thread's status for one scope. */
export class ScopedThreadStatus
{
  /** The status to restore; Carbon's `m_prevStatus`. */
  _prevStatus = 0;

  /**
   * `ScopedThreadStatus( status )` (IBlueThreadMonitor.h:26-29) - sets this
   * thread's status and remembers the previous one.
   *
   * @param {number} status `IBlueThreadMonitor` `BTS_*` status.
   */
  constructor(status)
  {
    this._prevStatus = BeThreadMonitor.SetThreadStatus(status);
  }

  /**
   * `~ScopedThreadStatus` (IBlueThreadMonitor.h:31-34) - restores the
   * previous status.
   *
   * @adapted
   */
  Destruct()
  {
    BeThreadMonitor.SetThreadStatus(this._prevStatus);
  }
}

CjsSchema.meta.define(ScopedThreadStatus, { className: "ScopedThreadStatus", carbon: "ScopedThreadStatus" });
