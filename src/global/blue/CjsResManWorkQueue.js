// resMan's two queues, `BlueResManQueue` (blue/include/IBlueResMan.h:12-18):
// BRMQ_MAIN, ticked on the main thread, and BRMQ_BACKGROUND. Carbon backs each
// with a BlueCallbackMan (BlueResMan.cpp:107-109); so does this. What stays
// here is resMan's bookkeeping on top: the promise each task's caller awaits,
// its metadata, the reason it was cancelled, and a pause.
//
// Ours: a browser fetch occupies nothing while it waits, so the background
// queue runs in `Update` mode with several async slots on the main thread
// instead of Carbon's blocking background threads; its slot count caps loads
// in flight. Pausing a queue ticked by `Update` is ours too - Carbon only
// pauses a manager running its own threads (CallbackMan.cpp:273-279).
import { BlueCallbackMan } from "./BlueCallbackMan.js";
import { CjsBlueOS } from "./CjsBlueOS.js";
import { IBlueCallbackMan } from "./IBlueCallbackMan.js";

/** `BlueResManQueue` names, with the load/prepare aliases resMan accepts. */
export const CjsResManQueue = Object.freeze({
  MAIN: "main",
  BACKGROUND: "background",
  PREPARE: "main",
  LOAD: "background"
});

/**
 * One resMan queue: a `BlueCallbackMan` ticked by `Pump`, plus the task
 * records resMan awaits.
 */
export class CjsResManWorkQueue
{
  /** Running tasks, by id. */
  _active = new Map();

  /** The callback manager the tasks run on. */
  _manager = new BlueCallbackMan();

  _name;

  _onReady;

  _paused = false;

  /** Tasks not yet started, by id. */
  _queued = new Map();

  /** Creates a queue with caller-provided initial state. */
  constructor(name, options = {}) {
    this._name = CjsResManWorkQueue.normalizeName(name);
    this._manager.SetName(this._name);
    this._onReady = typeof options.onReady === "function" ? options.onReady : null;
    this.SetConcurrency(options.concurrency ?? 1);
  }

  /**
   * How many tasks may run together: the callback manager's slot count.
   *
   * @param {number} value Positive integer, at most 32.
   * @returns {CjsResManWorkQueue} This queue.
   */
  SetConcurrency(value) {
    if (!Number.isInteger(value) || value < 1) {
      throw new TypeError("CjsBlueResMan queue concurrency must be a positive integer.");
    }
    this._manager.SetThreadCount(value);
    this._NotifyReady();
    return this;
  }

  /** The number of tasks allowed to run together. */
  GetConcurrency() {
    return this._manager._threadCount;
  }

  /** The id the next task will get (`IBlueCallbackMan::GetNextId`). */
  GetNextId() {
    return this._manager.GetNextId();
  }

  /** Tasks waiting to start. */
  GetQueuedCount() {
    return this._queued.size;
  }

  /** Tasks running. */
  GetActiveCount() {
    return this._active.size;
  }

  /** Tasks waiting or running. */
  GetPendingCount() {
    return this._queued.size + this._active.size;
  }

  /** Whether the queue is held from starting tasks. */
  IsPaused() {
    return this._paused;
  }

  /**
   * Queues one task and returns its record, whose promise settles with the
   * callback's outcome.
   *
   * @param {Function} callback Called with `{ id, queue, metadata }`, `this` being the context.
   * @param {*} [context=null] The callback's `this`.
   * @param {object|null} [metadata=null] Diagnostics kept on the record; `flags` holds `BCBF_*` flags.
   * @returns {object} The task record: id, queue, state, metadata and promise.
   * @throws {TypeError} When the callback is not a function.
   */
  Add(callback, context = null, metadata = null) {
    if (typeof callback !== "function") {
      throw new TypeError("CjsBlueResMan queue items require a callback.");
    }

    let resolve;
    let reject;
    const promise = new Promise((onResolve, onReject) => {
      resolve = onResolve;
      reject = onReject;
    });
    const item = {
      id: 0,
      queue: this._name,
      callback,
      context,
      metadata,
      promise,
      resolve,
      reject,
      state: "queued"
    };

    const id = { value: 0 };
    const flags = metadata && Number.isInteger(metadata.flags) ? metadata.flags : IBlueCallbackMan.BCBF_NONE;
    this._manager.Add(() => this._Start(item), null, flags, id);
    item.id = id.value;

    this._queued.set(item.id, item);
    this._NotifyReady();
    return item;
  }

  /**
   * Cancels a task that has not started.
   *
   * @param {number} id Task id.
   * @param {string} [reason=""] Appended to the rejection message.
   * @returns {boolean} Whether a waiting task was cancelled.
   */
  Cancel(id, reason = "") {
    const item = this._queued.get(id);
    if (!item) return false;

    this._queued.delete(id);
    this._manager.Cancel(id);
    item.state = "cancelled";
    item.reject(CjsResManWorkQueue.createCancelledError(this._name, id, reason));
    return true;
  }

  /** Holds the queue from starting tasks until resumed. */
  Pause() {
    this._paused = true;
    return this;
  }

  /** Lets the queue start tasks again. */
  Resume() {
    if (!this._paused) return this;
    this._paused = false;
    this._NotifyReady();
    return this;
  }

  /** Cancels every task that has not started; returns how many. */
  Clear(reason = "Queue cleared.") {
    const ids = [ ...this._queued.keys() ];
    for (const id of ids) this.Cancel(id, reason);
    return ids.length;
  }

  /**
   * Starts waiting tasks while slots are free, within the item and time
   * limits - `Update` called in a loop, as resMan's tick does
   * (BlueResMan.cpp:450-464).
   *
   * @param {object} [options={}] `maxItems`, `maxTime` (ms) and a `now` clock.
   * @returns {object} Processed, queued, active and pending counts, and whether paused.
   */
  Pump(options = {}) {
    const maxItems = normalizeLimit(options.maxItems);
    const maxTime = normalizeLimit(options.maxTime);
    const now = typeof options.now === "function" ? options.now : defaultNow;
    const startedAt = now();
    let processed = 0;

    if (!this._paused) {
      while (processed < maxItems && this._manager.Update()) {
        processed++;
        if (now() - startedAt >= maxTime) break;
      }
    }

    return {
      processed,
      queued: this.GetQueuedCount(),
      active: this.GetActiveCount(),
      pending: this.GetPendingCount(),
      paused: this._paused
    };
  }

  /** A snapshot of the queue's counts and policy. */
  GetStats() {
    return {
      name: this._name,
      nextId: this.GetNextId(),
      concurrency: this.GetConcurrency(),
      queued: this.GetQueuedCount(),
      active: this.GetActiveCount(),
      pending: this.GetPendingCount(),
      paused: this._paused
    };
  }

  /** Runs one task as the callback manager's entry; a promise holds its slot. */
  _Start(item) {
    this._queued.delete(item.id);
    item.state = "active";
    this._active.set(item.id, item);

    let result;
    try {
      result = item.callback.call(item.context, {
        id: item.id,
        queue: item.queue,
        metadata: item.metadata
      });
    } catch (error) {
      this._Settle(item, false, error);
      return undefined;
    }

    if (result instanceof Promise) {
      return result.then(
        value => this._Settle(item, true, value),
        error => this._Settle(item, false, error)
      );
    }
    this._Settle(item, true, result);
    return undefined;
  }

  /** Settles one running task and lets waiting ones start. */
  _Settle(item, didResolve, value) {
    if (!this._active.delete(item.id)) return;
    item.state = didResolve ? "resolved" : "rejected";
    if (didResolve) item.resolve(value);
    else item.reject(value);
    this._NotifyReady();
  }

  /** Tells the manager when there is something to start. */
  _NotifyReady() {
    if (this._onReady && !this._paused && this.GetQueuedCount() > 0) {
      this._onReady(this);
    }
  }

  /**
   * Resolves a queue name or alias to its canonical execution lane.
   *
   * @param {*} value
   * @returns {string}
   */
  static normalizeName(value)
  {
    const name = String(value ?? "").trim().toLowerCase();
    if (name === "main" || name === "prepare") return CjsResManQueue.MAIN;
    if (name === "background" || name === "load") return CjsResManQueue.BACKGROUND;
    throw new TypeError(`Unknown CjsBlueResMan queue: ${value}`);
  }

  /**
   * Creates the structured error used when queued work is cancelled.
   *
   * @param {string} queue
   * @param {number} id
   * @param {string} reason
   * @returns {Error}
   */
  static createCancelledError(queue, id, reason = "")
  {
    const error = new Error(`CjsBlueResMan ${queue} queue item ${id} was cancelled.${reason ? ` ${reason}` : ""}`);
    error.code = "CJS_RESMAN_QUEUE_CANCELLED";
    error.queue = queue;
    error.id = id;
    return error;
  }
}

function normalizeLimit(value) {
  if (value === undefined || value === null || value === 0) return Number.POSITIVE_INFINITY;
  if (typeof value !== "number" || Number.isNaN(value) || value < 0) {
    throw new TypeError("CjsBlueResMan queue limits must be non-negative numbers.");
  }
  return value;
}

/** BeTimer's role (BlueResMan.cpp:446): blue's host milliseconds. */
function defaultNow() {
  return CjsBlueOS.Monotonic();
}
