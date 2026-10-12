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

    if (this._isRunningOwnThreads && (flags & IBlueCallbackMan.BCBF_FENCE))
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

    this._isRunningOwnThreads = true;
    this._stop = false;

    this._threads = [];
    for (let i = 0; i < this._threadCount; ++i)
    {
      const td = new BlueCallbackManThreadData(i);
      td.name = this._ThreadName(i);
      td.worker = this._workerFactory(this._workerModule, { type: "module", name: td.name });
      td.worker.onmessage = event => this._OnWorkerMessage(td, event.data);
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

    for (const td of this._threads) td.worker.terminate();
    this._threads = [];
    this._isRunningOwnThreads = false;
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
   * which a synchronous callback always frees before the next call.
   *
   * @returns {boolean} Whether an entry was started.
   */
  Update()
  {
    if (this._isRunningOwnThreads) throw new Error("BlueCallbackMan.Update: the manager runs its own threads.");

    while (this._threads.length < this._threadCount) this._threads.push(new BlueCallbackManThreadData(this._threads.length));

    const td = this._threads.find(slot => slot.inProgress === null);
    if (!td) return false;
    return this._UpdateThread(td);
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

      if (fencedEntry.fenceMask === 0)
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
    };

    if (entry.name !== null)
    {
      td.inProgress = this._RunOnWorker(td, entry).then(finish, finish);
      return true;
    }

    const result = entry.callback(entry.context);
    if (result instanceof Promise) td.inProgress = result.then(finish, finish);
    else finish();
    return true;
  }

  /** Hands a named entry to the slot's worker; settles when the worker answers. */
  _RunOnWorker(td, entry)
  {
    if (td.worker === null) throw new Error(`BlueCallbackMan: named entry "${entry.name}" needs the own threads (Run).`);

    return new Promise(settle =>
    {
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

    // A cancelled entry's outcome is discarded (cpp:405, m_currentId check).
    if (td.currentId === message.id)
    {
      if (message.kind === "done") pending.completion.resolve(message.result);
      else pending.completion.reject(Object.assign(new Error(message.error.message), message.error));
    }
    pending.settle();
  }

  /** Starts entries on every idle own thread; Carbon's `m_alarm` wake-up. */
  _Alarm()
  {
    if (!this._isRunningOwnThreads || this._stop) return;

    for (const td of this._threads)
    {
      if (this._pauseCounter > 0) return;
      if (td.inProgress !== null) continue;
      if (!this._UpdateThread(td)) return;
      this.Throttle();
    }
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
   * `SetPriority` (CallbackMan.cpp:475-491).
   *
   * Not implemented: a browser gives a worker no priority, so there is
   * nothing to set.
   *
   * @param {number} _priority `CCP_THREAD_PRIORITY_*`.
   * @throws {Error} Always.
   */
  SetPriority(_priority)
  {
    throw new Error(`BlueCallbackMan.SetPriority is not implemented: workers have no priority (range ${CCP_THREAD_PRIORITY_LOWEST}..${CCP_THREAD_PRIORITY_HIGHEST}).`);
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
    SetPriority: [ meta.notImplemented ],
    SetThreadCount: [ meta.implemented ],
    SetName: [ meta.adapted ],
    SetWorkerModule: [ meta.ours ],
    SetWorkerFactory: [ meta.ours ]
  }
});

/**
 * `BeCallbackMan` (ResourceLoading.cpp:24, :81-91) - the global background
 * callback manager. Carbon creates and runs it at startup; here the
 * orchestrator gives it a worker module and a thread count, then runs it.
 */
export const BeCallbackMan = new BlueCallbackMan();
BeCallbackMan.SetName("BeCallbackMan");
