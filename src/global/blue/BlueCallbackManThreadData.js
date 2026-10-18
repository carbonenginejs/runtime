// Source: blue/src/CallbackMan.h:124-148
//
// Carbon nests this struct privately in `BlueCallbackMan`; it is reachable as
// `BlueCallbackMan.ThreadData` and is not exported from the folder's index.
import { CjsSchema } from "#schema";

/** `BlueCallbackMan::ThreadData` (CallbackMan.h:124-148): one thread, here one slot. */
export class BlueCallbackManThreadData
{
  /** Thread index, used for the fence bitmask. */
  threadIndex = 0;

  /** Id of the entry being processed, or 0. */
  currentId = 0;

  /** Settles when the entry in progress has finished; Carbon's `m_cbInProgressMutex`. */
  inProgress = null;

  /** Id of the entry handed to the slot's worker; unlike `currentId`, a cancel keeps it. */
  workerEntryId = 0;

  /** The slot's worker, for a manager running its own threads. */
  worker = null;

  /** Thread name. */
  name = "BlueCallbackManThread";

  /**
   * Creates the data for one slot.
   *
   * @param {number} threadIndex Slot index.
   */
  constructor(threadIndex)
  {
    this.threadIndex = threadIndex;
  }
}

CjsSchema.meta.define(BlueCallbackManThreadData, { className: "BlueCallbackManThreadData", carbon: "BlueCallbackMan::ThreadData" });
