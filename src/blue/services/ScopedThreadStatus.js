// Source: blue/include/IBlueThreadMonitor.h:23-40
//
// Sets this thread's status for a scope and restores the previous one when
// the scope ends. Carbon restores it in the destructor; JavaScript has no
// destructors, so the owner calls `Destruct`, normally in a `finally`.
import { CjsGraph } from "../../global/model/graph/CjsGraph.js";
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
   * Ends this object, once: its C++ destruction, level by level.
   * @cjs Thin public entry. Carbon's class is not an IRoot, so it does not take IRoot's Destruct.
   * @param {*} [options] Handed to an OnDestruct, where a class below this one has one.
   * @returns {boolean} True if it ran; false on a second call.
   */
  Destruct(options)
  {
    return CjsGraph.destruct(this, options);
  }

  /**
   * `~ScopedThreadStatus` (IBlueThreadMonitor.h:31-34) - restores the
   * previous status.
   *
   * @adapted
   * Carbon: ~ScopedThreadStatus (blue/include/IBlueThreadMonitor.h:31-34).
   * @adapted Existing JS cleanup runs through graph dispatch; ownership and callers are unchanged.
   */
  _Destructor()
  {
    BeThreadMonitor.SetThreadStatus(this._prevStatus);
  }
}

CjsSchema.meta.define(ScopedThreadStatus, { name: "ScopedThreadStatus", carbon: "ScopedThreadStatus", capabilities: [ "destruct" ] });
