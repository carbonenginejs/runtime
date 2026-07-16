export const CjsResManQueue = Object.freeze({
  MAIN: "main",
  BACKGROUND: "background",
  PREPARE: "main",
  LOAD: "background"
});

export function NormalizeCjsResManQueue(value) {
  const name = String(value ?? "").trim().toLowerCase();
  if (name === "main" || name === "prepare") return CjsResManQueue.MAIN;
  if (name === "background" || name === "load") return CjsResManQueue.BACKGROUND;
  throw new TypeError(`Unknown CjsResMan queue: ${value}`);
}

export function CjsResManQueueCancelledError(queue, id, reason = "") {
  const error = new Error(`CjsResMan ${queue} queue item ${id} was cancelled.${reason ? ` ${reason}` : ""}`);
  error.code = "CJS_RESMAN_QUEUE_CANCELLED";
  error.queue = queue;
  error.id = id;
  return error;
}

/**
 * Small FIFO executor used internally by CjsResMan.
 *
 * Queue policy stays in the manager. This class only tracks ids, pause state,
 * concurrency, cancellation, and sync/async completion.
 */
export class CjsResManWorkQueue
{
  #active = new Map();
  #concurrency = 1;
  #head = 0;
  #items = [];
  #name;
  #nextId = 1;
  #onReady;
  #paused = false;
  #queued = new Map();

  constructor(name, options = {}) {
    this.#name = NormalizeCjsResManQueue(name);
    this.#onReady = typeof options.onReady === "function" ? options.onReady : null;
    this.SetConcurrency(options.concurrency ?? 1);
  }

  SetConcurrency(value) {
    if (!Number.isInteger(value) || value < 1) {
      throw new TypeError("CjsResMan queue concurrency must be a positive integer.");
    }
    this.#concurrency = value;
    this.#NotifyReady();
    return this;
  }

  GetConcurrency() {
    return this.#concurrency;
  }

  GetNextId() {
    return this.#nextId;
  }

  GetQueuedCount() {
    return this.#queued.size;
  }

  GetActiveCount() {
    return this.#active.size;
  }

  GetPendingCount() {
    return this.#queued.size + this.#active.size;
  }

  IsPaused() {
    return this.#paused;
  }

  Add(callback, context = null, metadata = null) {
    if (typeof callback !== "function") {
      throw new TypeError("CjsResMan queue items require a callback.");
    }

    const id = this.#nextId++;
    let resolve;
    let reject;
    const promise = new Promise((onResolve, onReject) => {
      resolve = onResolve;
      reject = onReject;
    });
    const item = {
      id,
      queue: this.#name,
      callback,
      context,
      metadata,
      promise,
      resolve,
      reject,
      state: "queued"
    };

    this.#items.push(item);
    this.#queued.set(id, item);
    this.#NotifyReady();
    return item;
  }

  Cancel(id, reason = "") {
    const item = this.#queued.get(id);
    if (!item) return false;
    this.#queued.delete(id);
    item.state = "cancelled";
    item.reject(CjsResManQueueCancelledError(this.#name, id, reason));
    this.#Compact();
    return true;
  }

  Pause() {
    this.#paused = true;
    return this;
  }

  Resume() {
    if (!this.#paused) return this;
    this.#paused = false;
    this.#NotifyReady();
    return this;
  }

  Clear(reason = "Queue cleared.") {
    const ids = [ ...this.#queued.keys() ];
    for (const id of ids) this.Cancel(id, reason);
    this.#Compact(true);
    return ids.length;
  }

  Pump(options = {}) {
    const maxItems = NormalizeLimit(options.maxItems);
    const maxTime = NormalizeLimit(options.maxTime);
    const now = typeof options.now === "function" ? options.now : DefaultNow;
    const startedAt = now();
    let processed = 0;

    if (!this.#paused) {
      while (this.#active.size < this.#concurrency && processed < maxItems) {
        const item = this.#TakeNext();
        if (!item) break;
        this.#Start(item);
        processed++;
        if (processed > 0 && now() - startedAt >= maxTime) break;
      }
    }

    this.#Compact();
    return Object.freeze({
      processed,
      queued: this.GetQueuedCount(),
      active: this.GetActiveCount(),
      pending: this.GetPendingCount(),
      paused: this.#paused
    });
  }

  GetStats() {
    return Object.freeze({
      name: this.#name,
      nextId: this.#nextId,
      concurrency: this.#concurrency,
      queued: this.GetQueuedCount(),
      active: this.GetActiveCount(),
      pending: this.GetPendingCount(),
      paused: this.#paused
    });
  }

  #TakeNext() {
    while (this.#head < this.#items.length) {
      const item = this.#items[this.#head++];
      if (item.state !== "queued") continue;
      this.#queued.delete(item.id);
      return item;
    }
    return null;
  }

  #Start(item) {
    item.state = "active";
    this.#active.set(item.id, item);

    let result;
    try {
      result = item.callback.call(item.context, Object.freeze({
        id: item.id,
        queue: item.queue,
        metadata: item.metadata
      }));
    } catch (error) {
      this.#Settle(item, false, error);
      return;
    }

    if (result && typeof result.then === "function") {
      Promise.resolve(result).then(
        value => this.#Settle(item, true, value),
        error => this.#Settle(item, false, error)
      );
      return;
    }
    this.#Settle(item, true, result);
  }

  #Settle(item, didResolve, value) {
    if (!this.#active.delete(item.id)) return;
    item.state = didResolve ? "resolved" : "rejected";
    if (didResolve) item.resolve(value);
    else item.reject(value);
    this.#NotifyReady();
  }

  #Compact(force = false) {
    if (force || (this.#head > 256 && this.#head > this.#items.length * 0.5)) {
      this.#items = this.#items.slice(this.#head);
      this.#head = 0;
    }
  }

  #NotifyReady() {
    if (this.#onReady && !this.#paused && this.GetQueuedCount() > 0) {
      this.#onReady(this);
    }
  }
}

function NormalizeLimit(value) {
  if (value === undefined || value === null || value === 0) return Number.POSITIVE_INFINITY;
  if (typeof value !== "number" || Number.isNaN(value) || value < 0) {
    throw new TypeError("CjsResMan queue limits must be non-negative numbers.");
  }
  return value;
}

function DefaultNow() {
  return globalThis.performance?.now?.() ?? Date.now();
}
