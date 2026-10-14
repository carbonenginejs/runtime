// Source: blue/src/CallbackMan.h
// Source: blue/src/CallbackMan.cpp
//
// A callback manager: entries of (callback, context) in a regular queue, an
// urgent queue that always goes first, and a fence queue holding entries that
// may only run once every thread has drained what was queued before them. It
// either runs its own threads (`Run`) or processes one entry per `Update`
// call on the caller's thread.
//
// What the browser changes, each marked at its method:
//
// - Threads are workers. A worker cannot run a main-thread function or touch
//   the caller's memory, so an entry for the own threads names a callback the
//   worker module exports (`Add__Name`), carries a cloneable context, and
//   hands its result back as a promise instead of writing into shared memory.
// - An entry may be asynchronous. It holds its thread slot (Carbon's
//   `m_currentId`) until it settles; "busy" means "awaiting". `Update` mode
//   may therefore run several entries at once, one per slot.
// - Nothing blocks. Carbon's `Cancel` waits on the in-progress mutex and
//   `Stop` joins the threads; here both return promises. The semaphores
//   (`m_alarm`, `m_pauseSemaphore`) become a dispatch on add, on completion
//   and on resume.
import { CjsSchema, meta } from "#schema";
import { IBlueCallbackMan } from "./IBlueCallbackMan.js";

/**
 * @typedef {object} BlueCallbackEntry
 * @property {number} id Entry id.
 * @property {Function|null} callback Callback run on the caller's thread, or null for a named entry.
 * @property {string|null} name Worker callback name, or null.
 * @property {*} context Passed to the callback.
 * @property {Transferable[]} transfer Buffers handed to the worker with the context.
 * @property {number} timeStamp When it was queued, in seconds.
 * @property {number} fenceMask One bit per thread still to drain before it runs.
 * @property {{resolve: Function, reject: Function}|null} completion Settles a named entry's promise.
 */

/** Carbon's thread priority range (core/include/CcpThread.h:39-46). */
const CCP_THREAD_PRIORITY_LOWEST = -2;
const CCP_THREAD_PRIORITY_HIGHEST = 2;

/** The most threads `SetThreadCount` allows (CallbackMan.cpp:86-90). */
const MAX_THREAD_COUNT = 32;

/** Seconds on a monotonic clock, in place of `CcpGetTimestamp` / `s_qpFreq`. */
function timestampSeconds()
{
  return performance.now() / 1000;
}

/** The rejection a cancelled entry's promise gets. */
function createCancelledError(id)
{
  const error = new Error(`BlueCallbackMan: entry ${id} was cancelled.`);
  error.name = "AbortError";
  return error;
}

/** `BlueCallbackMan::ThreadData` (CallbackMan.h:124-148): one thread, here one slot. */
class BlueCallbackManThreadData
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

/** `BlueCallbackMan` - a callback queue run by its own workers or by `Update`. */
export class BlueCallbackMan extends IBlueCallbackMan
{
  /** Base name, used to identify threads. */
  _name = "";

  /** Entries queued or in progress. */
  _size = 0;

  /** @type {BlueCallbackEntry[]} */
  _queue = [];

  /** @type {BlueCallbackEntry[]} */
  _urgentQueue = [];

  /** @type {BlueCallbackEntry[]} */
  _fenceQueue = [];

  /** Callback ids are a simple incrementing counter. */
  _nextId = 1;

  _threadCount = 1;

  _isRunningOwnThreads = false;

  /** @type {BlueCallbackManThreadData[]} */
  _threads = [];

  _threadPriority = 0;

  _pauseCounter = 0;

  _stop = false;

  _timeInQueueMax = 0;

  _timeInQueueTotal = 0;

  _timeInQueueAverage = 0;

  _entriesProcessed = 0;

  /** @type {string|URL|null} */
  _workerModule = null;

  /** @type {(module: string|URL, options: object) => Worker} */
  _workerFactory = (module, options) => new Worker(module, options);

  /** Named entries handed to a worker, by id, awaiting its answer. */
  _workerEntries = new Map();

  /** Set while `_Alarm` is starting entries; a nested alarm is deferred to its loop. */
  _alarming = false;

  /** A nested alarm arrived while `_Alarm` was running. */
  _alarmAgain = false;

  /** The `Update` slot to try first next time; slots take turns, as threads do. */
  _nextUpdateSlot = 0;

  /** Called when an `Update` slot frees; see `SetSlotFreeCallback`. */
  _onSlotFree = null;

  /**
   * `Add` (CallbackMan.cpp:94-146) - queues a callback run on the caller's
   * thread by `Update`.
   *
   * Adapted: Carbon writes the id through its `CcpAtomic<uint32_t>*` out
   * parameter; here `id`, when given, is an object whose `value` receives it.
   * A function cannot be handed to a worker, so a manager running its own
   * threads takes only named entries (`Add__Name`).
   *
   * @param {Function} callback Called with the context.
   * @param {*} [context=null] Passed to the callback.
   * @param {number} [flags=IBlueCallbackMan.BCBF_NONE] `BCBF_*` flags.
   * @param {{value: number}|null} [id=null] Receives the entry id.
   * @returns {boolean} True.
   * @throws {TypeError} When the callback is not a function, or the manager runs its own threads.
   */
  Add(callback, context = null, flags = IBlueCallbackMan.BCBF_NONE, id = null)
  {
    if (typeof callback !== "function") throw new TypeError("BlueCallbackMan.Add requires a function.");
    if (this._isRunningOwnThreads)
    {
      throw new TypeError("BlueCallbackMan.Add: a manager running its own threads takes named entries (Add__Name).");
    }

    this._AddHelper(callback, null, context, [], flags, id, null);
    return true;
  }

  /**
   * `Add` for an entry run on the own threads, by callback name.
   *
   * Adapted: a worker cannot run a main-thread function or write into the
   * caller's memory, so the entry names a callback the worker module exports,
   * its context must be cloneable, and its result comes back as the promise's
   * value. `transfer` lists buffers moved, not copied, into the worker.
   *
   * @param {string} name Callback name exported by the worker module.
   * @param {*} [context=null] Cloneable context.
   * @param {number} [flags=IBlueCallbackMan.BCBF_NONE] `BCBF_*` flags.
   * @param {{value: number}|null} [id=null] Receives the entry id.
   * @param {Transferable[]} [transfer=[]] Buffers to move into the worker.
   * @returns {Promise<*>} The callback's result; rejects with an AbortError when cancelled.
   */
  Add__Name(name, context = null, flags = IBlueCallbackMan.BCBF_NONE, id = null, transfer = [])
  {
    if (typeof name !== "string" || name === "") throw new TypeError("BlueCallbackMan.Add__Name requires a callback name.");

    return new Promise((resolve, reject) =>
    {
      this._AddHelper(null, name, context, transfer, flags, id, { resolve, reject });
    });
  }

  /** Queues one entry; the body of Carbon's `Add` (cpp:98-143). */
  _AddHelper(callback, name, context, transfer, flags, id, completion)
  {
    if (id) id.value = this._nextId;

    /** @type {BlueCallbackEntry} */
    const entry = {
      id: this._nextId,
      callback,
      name,
      context,
      transfer,
      timeStamp: timestampSeconds(),
      fenceMask: 0,
      completion
    };

    // Adapted: Carbon fences only for its own threads (cpp:113); Update mode
    // there runs one entry at a time, so ordering holds by itself. Ours keeps
    // several async slots in Update mode, so a fence applies there too.
    if ((this._isRunningOwnThreads || this._threadCount > 1) && (flags & IBlueCallbackMan.BCBF_FENCE))
    {
      for (let i = 0; i < this._threadCount; ++i) entry.fenceMask |= 1 << i;
    }

    if (flags & IBlueCallbackMan.BCBF_URGENT) this._urgentQueue.push(entry);
    else this._queue.push(entry);

    ++this._nextId;
    ++this._size;

    if (this._isRunningOwnThreads) this._Alarm();
  }

  /**
   * `Cancel` (CallbackMan.cpp:148-187) - removes a queued entry; for one in
   * progress, discards its outcome.
   *
   * Adapted: Carbon blocks on the in-progress mutex until the callback
   * finishes; nothing blocks here, so the returned promise settles then
   * instead. A worker is also told, and stops the entry at its next yield.
   *
   * @param {number} id Entry id.
   * @returns {Promise<void>} Settles once the entry is no longer running.
   */
  Cancel(id)
  {
    for (const td of this._threads)
    {
      if (id !== td.currentId) continue;

      // Callback being canceled is already in progress - wait for it to finish
      td.currentId = 0;
      const pending = this._workerEntries.get(id);
      if (pending)
      {
        td.worker.postMessage({ kind: "cancel", id });
        pending.completion.reject(createCancelledError(id));
      }
      return td.inProgress ? td.inProgress.then(() => {}, () => {}) : Promise.resolve();
    }

    const entry = this._RemoveFromQueue(this._urgentQueue, id)
      || this._RemoveFromQueue(this._queue, id)
      || this._RemoveFromQueue(this._fenceQueue, id);
    if (entry && entry.completion) entry.completion.reject(createCancelledError(id));
    return Promise.resolve();
  }

  /**
   * `Run` (CallbackMan.cpp:189-207) - creates the own threads.
   *
   * Adapted: each thread is a worker built from the module given to
   * `SetWorkerModule`; there are no OS threads to create.
   *
   * @throws {Error} When no worker module is set.
   */
  Run()
  {
    if (this._workerModule === null) throw new Error("BlueCallbackMan.Run: no worker module set (SetWorkerModule).");
    if (this._isRunningOwnThreads) throw new Error("BlueCallbackMan.Run: the own threads are already running.");

    this._isRunningOwnThreads = true;
    this._stop = false;

    this._threads = [];
    for (let i = 0; i < this._threadCount; ++i)
    {
      const td = new BlueCallbackManThreadData(i);
      td.name = this._ThreadName(i);
      this._CreateWorker(td);
      this._threads.push(td);
    }

    this._Alarm();
  }

  /**
   * `Stop` (CallbackMan.cpp:245-271) - stops the own threads.
   *
   * Adapted: Carbon joins each thread; here the promise settles once every
   * entry in progress has finished, then the workers are terminated.
   *
   * @returns {Promise<void>} Settles once the workers are gone.
   */
  async Stop()
  {
    if (!this._isRunningOwnThreads) throw new Error("BlueCallbackMan.Stop: the manager is not running its own threads.");

    this._stop = true;
    await Promise.all(this._threads.map(td => td.inProgress ? td.inProgress.then(() => {}, () => {}) : null));

    for (const td of this._threads) if (td.worker !== null) td.worker.terminate();
    this._threads = [];
    this._isRunningOwnThreads = false;

    // Entries never started stay queued, as in Carbon, except named ones: their
    // promise would wait forever on a worker that no longer exists, so they are
    // rejected and removed, and no later Run executes work already reported aborted.
    for (const queue of [ this._urgentQueue, this._queue, this._fenceQueue ])
    {
      for (let i = queue.length - 1; i >= 0; --i)
      {
        const entry = queue[i];
        if (entry.name === null) continue;
        queue.splice(i, 1);
        --this._size;
        entry.completion.reject(createCancelledError(entry.id));
      }
    }
  }

  /** `Pause` (CallbackMan.cpp:273-279) - no new entry starts until resumed. */
  Pause()
  {
    if (!this._isRunningOwnThreads) throw new Error("BlueCallbackMan.Pause: the manager is not running its own threads.");
    this._pauseCounter++;
  }

  /** `Resume` (CallbackMan.cpp:281-295) - undoes one `Pause`. */
  Resume()
  {
    if (!this._isRunningOwnThreads) throw new Error("BlueCallbackMan.Resume: the manager is not running its own threads.");

    const pauseCounter = this._pauseCounter;
    if (pauseCounter > 0) this._pauseCounter--;
    if (pauseCounter === 1) this._Alarm();
  }

  /** `IsPaused` (CallbackMan.cpp:297-301). */
  IsPaused()
  {
    return this._pauseCounter > 0;
  }

  /** `Throttle` (CallbackMan.h:53) - a no-op; a subclass overrides it. */
  Throttle() {}

  /** `Unthrottle` (CallbackMan.h:57) - a no-op; a subclass overrides it. */
  Unthrottle() {}

  /**
   * `Update` (CallbackMan.cpp:303-316) - processes the next entry on the
   * caller's thread.
   *
   * Adapted: an asynchronous entry holds its slot until it settles, so the
   * manager keeps `SetThreadCount` slots for `Update` too; Carbon keeps one,
   * which a synchronous callback always frees before the next call. Idle
   * slots take turns, so each one checks the fence queue as Carbon's threads
   * do; always taking the first idle slot would leave the others' fence bits
   * set while regular entries keep coming.
   *
   * @returns {boolean} Whether an entry was started.
   */
  Update()
  {
    if (this._isRunningOwnThreads) throw new Error("BlueCallbackMan.Update: the manager runs its own threads.");

    while (this._threads.length < this._threadCount) this._threads.push(new BlueCallbackManThreadData(this._threads.length));
    // A lowered thread count retires the surplus slots once they are idle;
    // until then they finish what they hold and take nothing new.
    while (this._threads.length > this._threadCount && this._threads[this._threads.length - 1].inProgress === null) this._threads.pop();

    const count = Math.min(this._threads.length, this._threadCount);
    for (let i = 0; i < count; ++i)
    {
      const td = this._threads[(this._nextUpdateSlot + i) % count];
      if (td.inProgress !== null) continue;
      // An idle slot that finds nothing it may run (a fence still waiting on
      // others) has still cleared its own fence bit; the next idle slot tries.
      if (!this._UpdateThread(td)) continue;
      this._nextUpdateSlot = (td.threadIndex + 1) % count;
      return true;
    }
    return false;
  }

  /**
   * `UpdateThread` (CallbackMan.cpp:318-442) - takes the next entry for one
   * thread, fences first, then urgent, then regular, and runs it.
   */
  _UpdateThread(td)
  {
    let entry = null;
    let processedFenceEntry = false;

    if (this._fenceQueue.length)
    {
      const fencedEntry = this._fenceQueue[0];
      fencedEntry.fenceMask &= ~(1 << td.threadIndex);

      if (fencedEntry.fenceMask && !this._urgentQueue.length && !this._queue.length)
      {
        for (let i = 0; i < this._threadCount; ++i)
        {
          const otherThreadData = this._threads[i];
          if (otherThreadData !== td && otherThreadData.currentId === 0) fencedEntry.fenceMask &= ~(1 << i);
        }
      }

      // A surplus slot left by a lowered thread count has no fence bit; the fence waits for it too.
      if (fencedEntry.fenceMask === 0 && !this._threads.some(other => other.threadIndex >= this._threadCount && other.inProgress !== null))
      {
        entry = this._fenceQueue.shift();
        processedFenceEntry = true;
      }
    }

    // Note that size of queue is not decreased until after processing callback.
    if (!entry) entry = this._ExtractFromQueue(this._urgentQueue, td.threadIndex);
    if (!entry) entry = this._ExtractFromQueue(this._queue, td.threadIndex);

    if (!entry)
    {
      if (processedFenceEntry) this._Alarm();
      return false;
    }

    td.currentId = entry.id;

    const delta = timestampSeconds() - entry.timeStamp;
    if (delta > 0)
    {
      if (delta > this._timeInQueueMax) this._timeInQueueMax = delta;
      this._timeInQueueTotal += delta;
    }
    ++this._entriesProcessed;
    this._timeInQueueAverage = this._timeInQueueTotal / this._entriesProcessed;

    const finish = () =>
    {
      td.currentId = 0;
      td.inProgress = null;
      --this._size;
      if (processedFenceEntry || this._isRunningOwnThreads) this._Alarm();
      // Adapted: an Update-mode slot frees asynchronously, after the caller's
      // Update returned; the owner is told so it can start the next entry.
      if (!this._isRunningOwnThreads && this._onSlotFree !== null) this._onSlotFree();
    };

    if (entry.name !== null)
    {
      if (!this._isRunningOwnThreads)
      {
        // A named entry runs on a worker; in Update mode it fails rather than hold its place.
        entry.completion.reject(new Error(`BlueCallbackMan: named entry "${entry.name}" needs the own threads (Run).`));
        finish();
        return true;
      }
      // A worker that failed is replaced when its slot is next given work.
      if (td.worker === null) this._CreateWorker(td);
      td.inProgress = this._RunOnWorker(td, entry).then(finish, finish);
      return true;
    }

    let result;
    try
    {
      result = entry.callback(entry.context);
    }
    catch (error)
    {
      // Carbon's callbacks cannot throw; a JS one can, and must still free
      // its slot and its place in the size count.
      finish();
      throw error;
    }
    if (result instanceof Promise) td.inProgress = result.then(finish, finish);
    else finish();
    return true;
  }

  /** Hands a named entry to the slot's worker; settles when the worker answers. */
  _RunOnWorker(td, entry)
  {
    return new Promise(settle =>
    {
      td.workerEntryId = entry.id;
      this._workerEntries.set(entry.id, { entry, completion: entry.completion, settle });
      td.worker.postMessage({ kind: "run", id: entry.id, name: entry.name, context: entry.context }, entry.transfer);
    });
  }

  /** A worker's answer for the entry it was given. */
  _OnWorkerMessage(td, message)
  {
    const pending = this._workerEntries.get(message.id);
    if (!pending) return;
    this._workerEntries.delete(message.id);
    td.workerEntryId = 0;

    // A cancelled entry's outcome is discarded (cpp:405, m_currentId check).
    if (td.currentId === message.id)
    {
      if (message.kind === "done") pending.completion.resolve(message.result);
      else pending.completion.reject(Object.assign(new Error(message.error.message), message.error));
    }
    pending.settle();
  }

  /**
   * A worker failed: the entry it holds is rejected and its slot freed, even
   * when a cancel already cleared `currentId`. The worker is terminated, and
   * the slot gets a new one when it is next given work, so no entry waits on a
   * worker that cannot answer.
   */
  _OnWorkerFailure(td, event)
  {
    if (td.worker !== null)
    {
      td.worker.terminate();
      td.worker = null;
    }
    const id = td.workerEntryId;
    td.workerEntryId = 0;
    const pending = this._workerEntries.get(id);
    if (!pending) return;
    this._workerEntries.delete(id);

    const error = new Error(`BlueCallbackMan: worker ${td.name} failed: ${event.message || event.type || "error"}`);
    error.code = "CJS_CALLBACKMAN_WORKER_FAILED";
    pending.completion.reject(error);
    pending.settle();
  }

  /** Starts entries on every idle own thread; Carbon's `m_alarm` wake-up. */
  //
  // A signal only wakes waiting threads; it never runs work on the thread that
  // raised it. Here a signal raised while slots are being filled (a fenced
  // entry moving, cpp:557) is deferred to this loop, so the slot being filled
  // is never handed a second entry.
  _Alarm()
  {
    if (!this._isRunningOwnThreads || this._stop) return;
    if (this._alarming)
    {
      this._alarmAgain = true;
      return;
    }

    this._alarming = true;
    try
    {
      do
      {
        this._alarmAgain = false;
        for (const td of this._threads)
        {
          if (this._pauseCounter > 0) return;
          if (td.inProgress !== null || td.currentId !== 0) continue;
          // Every idle thread wakes, as on Carbon's signal; each clears its fence bit.
          if (!this._UpdateThread(td)) continue;
          this.Throttle();
        }
      }
      while (this._alarmAgain);
    }
    finally
    {
      this._alarming = false;
    }
  }

  /**
   * Gives the owner of an `Update`-mode manager a call whenever a slot frees.
   *
   * Adapted: Carbon's `Update` runs one synchronous callback per call, so its
   * caller always finds the slot free next time. An asynchronous entry here
   * frees its slot later, after `Update` returned; the owner uses this to
   * start the next entry then, instead of waiting for its next tick.
   *
   * @param {Function|null} callback Called with no arguments, or null.
   */
  SetSlotFreeCallback(callback)
  {
    if (callback !== null && typeof callback !== "function") throw new TypeError("BlueCallbackMan.SetSlotFreeCallback requires a function or null.");
    this._onSlotFree = callback;
  }

  /** Creates one own thread's worker and routes its messages and failures. */
  _CreateWorker(td)
  {
    td.worker = this._workerFactory(this._workerModule, { type: "module", name: td.name });
    td.worker.addEventListener("message", event => this._OnWorkerMessage(td, event.data));
    // A worker that fails to load or throws outside a callback fails the
    // entry it holds instead of leaving its promise pending.
    td.worker.addEventListener("error", event => this._OnWorkerFailure(td, event));
    td.worker.addEventListener("messageerror", event => this._OnWorkerFailure(td, event));
  }

  /** `IsEmpty` (CallbackMan.cpp:470-473). */
  IsEmpty()
  {
    return this._size === 0;
  }

  /** `GetNextId` (CallbackMan.cpp:520-523). */
  GetNextId()
  {
    return this._nextId;
  }

  /** `GetSize` (CallbackMan.cpp:515-518). */
  GetSize()
  {
    return this._size;
  }

  /** `GetTimeInQueueMax` (CallbackMan.cpp:444-451), in seconds. */
  GetTimeInQueueMax()
  {
    return this._timeInQueueMax;
  }

  /** `GetTimeInQueueAverage` (CallbackMan.cpp:453-460), in seconds. */
  GetTimeInQueueAverage()
  {
    return this._timeInQueueAverage;
  }

  /** `ResetQueueStats` (CallbackMan.cpp:462-468). */
  ResetQueueStats()
  {
    this._timeInQueueAverage = 0;
    this._timeInQueueMax = 0;
    this._timeInQueueTotal = 0;
    this._entriesProcessed = 0;
  }

  /**
   * `SetPriority` (CallbackMan.cpp:475-491) - clamped to Carbon's range and
   * stored.
   *
   * Adapted: a browser gives a worker no priority, so the value has no effect.
   *
   * @param {number} priority `CCP_THREAD_PRIORITY_*`, -2 to 2.
   */
  SetPriority(priority)
  {
    this._threadPriority = Math.min(CCP_THREAD_PRIORITY_HIGHEST, Math.max(CCP_THREAD_PRIORITY_LOWEST, priority));
  }

  /**
   * `SetThreadCount` (CallbackMan.cpp:84-92) - at most 32.
   *
   * @param {number} threadCount Thread count.
   */
  SetThreadCount(threadCount)
  {
    if (threadCount > MAX_THREAD_COUNT)
    {
      console.warn("BlueCallbackMan: Maximum thread count is 32");
      threadCount = MAX_THREAD_COUNT;
    }
    this._threadCount = threadCount;
  }

  /**
   * `SetName` (CallbackMan.cpp:493-513).
   *
   * Adapted: a worker's name is fixed when it is created, so a name set after
   * `Run` names the next run's workers.
   *
   * @param {string} name Name.
   */
  SetName(name)
  {
    this._name = name;
    for (const td of this._threads) td.name = this._ThreadName(td.threadIndex);
  }

  /**
   * The module each own thread runs.
   *
   * Ours: Carbon's threads run code already in the process; a worker has to
   * be told which module to load. The module exports its callbacks through
   * `BlueCallbackManWorker.install`.
   *
   * @param {string|URL} module Worker module.
   * @returns {BlueCallbackMan} This manager.
   */
  SetWorkerModule(module)
  {
    this._workerModule = module;
    return this;
  }

  /**
   * How a worker is created, for hosts without `Worker` (Node) and for tests.
   *
   * Ours: Carbon creates threads with `CcpCreateThread`; a host may need its
   * own worker constructor.
   *
   * @param {(module: string|URL, options: object) => Worker} factory Worker factory.
   * @returns {BlueCallbackMan} This manager.
   */
  SetWorkerFactory(factory)
  {
    this._workerFactory = factory;
    return this;
  }

  /** A thread's name: the manager's, with `_<index>` when there is more than one (cpp:502-508). */
  _ThreadName(index)
  {
    const name = this._name || "BlueCallbackManThread";
    return this._threadCount > 1 ? `${name}_${index}` : name;
  }

  /**
   * `RemoveFromQueue` (CallbackMan.cpp:525-540).
   *
   * Adapted: returns the removed entry rather than true, so `Cancel` can
   * reject a named entry's promise.
   */
  _RemoveFromQueue(queue, id)
  {
    const index = queue.findIndex(entry => entry.id === id);
    if (index === -1) return null;

    const [ entry ] = queue.splice(index, 1);
    --this._size;
    return entry;
  }

  /**
   * `ExtractFromQueue` (CallbackMan.cpp:543-575) - takes the first unfenced
   * entry; fenced entries met first move to the fence queue.
   */
  _ExtractFromQueue(queue, threadIndex)
  {
    while (queue.length && queue[0].fenceMask)
    {
      const entry = queue.shift();
      entry.fenceMask &= ~(1 << threadIndex);
      this._fenceQueue.push(entry);
      this._Alarm();
    }
    return queue.length ? queue.shift() : null;
  }
}

CjsSchema.define(BlueCallbackMan, {
  className: "BlueCallbackMan",
  carbon: "BlueCallbackMan",
  family: "blue",
  fields: {},
  methods: {
    Add: [ meta.adapted ],
    Add__Name: [ meta.adapted ],
    Cancel: [ meta.adapted ],
    Run: [ meta.adapted ],
    Stop: [ meta.adapted ],
    Pause: [ meta.implemented ],
    Resume: [ meta.implemented ],
    IsPaused: [ meta.implemented ],
    Throttle: [ meta.implemented ],
    Unthrottle: [ meta.implemented ],
    Update: [ meta.adapted ],
    IsEmpty: [ meta.implemented ],
    GetNextId: [ meta.implemented ],
    GetSize: [ meta.implemented ],
    GetTimeInQueueMax: [ meta.implemented ],
    GetTimeInQueueAverage: [ meta.implemented ],
    ResetQueueStats: [ meta.implemented ],
    SetPriority: [ meta.adapted ],
    SetThreadCount: [ meta.implemented ],
    SetName: [ meta.adapted ],
    SetWorkerModule: [ meta.ours ],
    SetWorkerFactory: [ meta.ours ]
  }
});
