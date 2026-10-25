// Source: blue/include/IBlueThreadMonitor.h
//
// Each thread reports what it is doing - idle, working, loading from disk or
// downloading - so a tool can show it (`BlueThreadMonitor.GetStatus`). Carbon
// sets the status for the scope of the work with `ScopedThreadStatus`
// (IBlueThreadMonitor.h:24-40), whose destructor restores the previous one.
// JavaScript has no destructors, so a caller restores the returned previous
// status itself, in a `finally` or when its asynchronous work settles.
import { CjsSchema, meta } from "#schema";
import { IRoot } from "./IRoot.js";

/** `IBlueThreadMonitor` - per-thread status, per blue/include/IBlueThreadMonitor.h. */
export class IBlueThreadMonitor extends IRoot
{
  /** `BTS_IDLE` (IBlueThreadMonitor.h:11). */
  static BTS_IDLE = 0;

  /** `BTS_WORKING` (IBlueThreadMonitor.h:12). */
  static BTS_WORKING = 1;

  /** `BTS_LOADING` - loading from disk (IBlueThreadMonitor.h:13). */
  static BTS_LOADING = 2;

  /** `BTS_DOWNLOADING` - downloading from the CDN (IBlueThreadMonitor.h:14). */
  static BTS_DOWNLOADING = 3;

  /**
   * `SetThreadStatus` - sets the calling thread's status.
   *
   * @param {number} _status `BTS_*` status.
   * @returns {number} The previous status.
   */
  SetThreadStatus(_status) {}
}

CjsSchema.decorateMethod(IBlueThreadMonitor, "SetThreadStatus", meta.abstract);
CjsSchema.exposure.interface("IBlueThreadMonitor")(IBlueThreadMonitor);
