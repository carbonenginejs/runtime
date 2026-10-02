export const CjsResManQueue = Object.freeze({
  MAIN: "main",
  BACKGROUND: "background",
  PREPARE: "main",
  LOAD: "background"
});

/**
 * Small FIFO executor used inside `CjsBlueResMan` that tracks item ids, pause
 * state, concurrency, cancellation, and sync/async completion while queue
 * policy stays in the manager.
 *
 * The queue deliberately does not choose task priority or resource policy.
 */
export class CjsResManWorkQueue
{
  _active = new Map();
  _concurrency = 1;
  _head = 0;
  _items = [];
  _name;
  _nextId = 1;
  _onReady;
  _paused = false;
  _queued = new Map();

  /** Creates a CjsResManWorkQueue with caller-provided initial state. */
  constructor(name, options = {}) {
    this._name = CjsResManWorkQueue.normalizeName(name);
    this._onReady = typeof options.onReady === "function" ? options.onReady : null;
    this.SetConcurrency(options.concurrency ?? 1);
  }

  /**
   * Updates the maximum number of tasks that may run together for the resource
   * work queue.
   */
  SetConcurrency(value) {
    if (!Number.isInteger(value) || value < 1) {
      throw new TypeError("CjsBlueResMan queue concurrency must be a positive integer.");
    }
    this._concurrency = value;
    this._NotifyReady();
    return this;
  }

  /**
   * Returns the maximum number of tasks allowed to run together for the resource
   * work queue.
   */
  GetConcurrency() {
    return this._concurrency;
  }

  /**
   * Allocates the next monotonically increasing task identifier for the resource
   * work queue.
   */
  GetNextId() {
    return this._nextId;
  }

  /** Returns the number of tasks waiting to start for the resource work queue. */
  GetQueuedCount() {
    return this._queued.size;
  }

  /** Returns the number of tasks currently executing for the resource work queue. */
  GetActiveCount() {
    return this._active.size;
  }

  /**
   * Returns the combined number of waiting and active tasks for the resource
   * work queue.
   */
  GetPendingCount() {
    return this._queued.size + this._active.size;
  }

  /**
   * Reports whether the queue is prevented from starting work for the resource
   * work queue.
   */
  IsPaused() {
    return this._paused;
  }

  /**
   * Enqueues one task and returns its cancellation-aware promise for the
   * resource work queue.
   */
  Add(callback, context = null, metadata = null) {
    if (typeof callback !== "function") {
      throw new TypeError("CjsBlueResMan queue items require a callback.");
    }

    const id = this._nextId++;
    let resolve;
    let reject;
    const promise = new Promise((onResolve, onReject) => {
      resolve = onResolve;
      reject = onReject;
    });
    const item = {
      id,
      queue: this._name,
      callback,
      context,
      metadata,
      promise,
      resolve,
      reject,
      state: "queued"
    };

    this._items.push(item);
    this._queued.set(id, item);
    this._NotifyReady();
    return item;
  }

  /**
   * Cancels a queued task selected by its identifier for the resource work
   * queue.
   */
  Cancel(id, reason = "") {
    const item = this._queued.get(id);
    if (!item) return false;
    this._queued.delete(id);
    item.state = "cancelled";
    item.reject(CjsResManWorkQueue.createCancelledError(this._name, id, reason));
    this._Compact();
    return true;
  }

  /**
   * Prevents queued tasks from starting until resumed for the resource work
   * queue.
   */
  Pause() {
    this._paused = true;
    return this;
  }

  /** Allows queued tasks to start after a pause for the resource work queue. */
  Resume() {
    if (!this._paused) return this;
    this._paused = false;
    this._NotifyReady();
    return this;
  }

  /** Cancels every task that has not started for the resource work queue. */
  Clear(reason = "Queue cleared.") {
    const ids = [ ...this._queued.keys() ];
    for (const id of ids) this.Cancel(id, reason);
    this._Compact(true);
    return ids.length;
  }

  /** Starts queued work while concurrency permits for the resource work queue. */
  Pump(options = {}) {
    const maxItems = normalizeLimit(options.maxItems);
    const maxTime = normalizeLimit(options.maxTime);
    const now = typeof options.now === "function" ? options.now : defaultNow;
    const startedAt = now();
    let processed = 0;

    if (!this._paused) {
      while (this._active.size < this._concurrency && processed < maxItems) {
        const item = this._TakeNext();
        if (!item) break;
        this._Start(item);
        processed++;
        if (processed > 0 && now() - startedAt >= maxTime) break;
      }
    }

    this._Compact();
    return {
      processed,
      queued: this.GetQueuedCount(),
      active: this.GetActiveCount(),
      pending: this.GetPendingCount(),
      paused: this._paused
    };
  }

  /**
   * Returns an immutable snapshot of queue counts and policy for the resource
   * work queue.
   */
  GetStats() {
    return {
      name: this._name,
      nextId: this._nextId,
      concurrency: this._concurrency,
      queued: this.GetQueuedCount(),
      active: this.GetActiveCount(),
      pending: this.GetPendingCount(),
      paused: this._paused
    };
  }

  /** Removes and returns the next runnable work item for the resource work queue. */
  _TakeNext() {
    while (this._head < this._items.length) {
      const item = this._items[this._head++];
      if (item.state !== "queued") continue;
      this._queued.delete(item.id);
      return item;
    }
    return null;
  }

  /** Starts one queued work item for the resource work queue. */
  _Start(item) {
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
      return;
    }

    if (result && typeof result.then === "function") {
      Promise.resolve(result).then(
        value => this._Settle(item, true, value),
        error => this._Settle(item, false, error)
      );
      return;
    }
    this._Settle(item, true, result);
  }

  /**
   * Settles one active work item and advances the queue for the resource work
   * queue.
   */
  _Settle(item, didResolve, value) {
    if (!this._active.delete(item.id)) return;
    item.state = didResolve ? "resolved" : "rejected";
    if (didResolve) item.resolve(value);
    else item.reject(value);
    this._NotifyReady();
  }

  /** Removes settled work items from the queue for the resource work queue. */
  _Compact(force = false) {
    if (force || (this._head > 256 && this._head > this._items.length * 0.5)) {
      this._items = this._items.slice(this._head);
      this._head = 0;
    }
  }

  /** Notifies waiters when the queue becomes ready for the resource work queue. */
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

function defaultNow() {
  return globalThis.performance?.now?.() ?? Date.now();
}
