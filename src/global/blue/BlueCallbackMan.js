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
import { exposure as be } from "#be";
import { CjsSchema, meta } from "#schema";
import { IBlueCallbackMan } from "./IBlueCallbackMan.js";
import { BlueCallbackManThreadData } from "./BlueCallbackManThreadData.js";
import { CjsBlueOS } from "./CjsBlueOS.js";
import { IBlueThreadMonitor } from "./IBlueThreadMonitor.js";
import { BeThreadMonitor, BlueThreadMonitor } from "./BlueThreadMonitor.js";
import { ScopedThreadStatus } from "./ScopedThreadStatus.js";
import * as CcpLog from "../logging/ccpLog.js";

/**
 * @typedef {object} BlueCallbackEntry
 * @property {number} id Entry id.
 * @property {Function|null} callback Callback run on the caller's thread, or null for a named entry.
 * @property {string|null} name Worker callback name, or null.
 * @property {*} context Passed to the callback.
 * @property {Transferable[]} transfer Buffers handed to the worker with the context.
 * @property {bigint} timeStamp When it was queued, in integer nanosecond ticks.
 * @property {number} fenceMask One bit per thread still to drain before it runs.
 * @property {{resolve: Function, reject: Function}|null} completion Settles a named entry's promise.
 * @property {string|null|undefined} label What the entry is, for its log lines; resolved when first reported.
 */

/** Carbon's thread priority range (core/include/CcpThread.h:39-46). */
const CCP_THREAD_PRIORITY_LOWEST = -2;
const CCP_THREAD_PRIORITY_HIGHEST = 2;

/** The most threads `SetThreadCount` allows (CallbackMan.cpp:86-90). */
const MAX_THREAD_COUNT = 32;

/**
 * Carbon's `CcpGetTimestamp()` (core/CcpTime.cpp:11-23), the steady counter the
 * queue stamps and measures against (CallbackMan.cpp:123, :408-411), as uint64
 * nanosecond ticks; its frequency, `CcpGetTimestampFrequency()`, is 1e9 here.
 * Adapted: the counter is Blue's host monotonic clock, `CjsBlueOS.Monotonic()`
 * (milliseconds), which every steady-clock port reads (blue-clock-epoch).
 */
function timestampTicks()
{
  return BigInt.asUintN(64, BigInt(Math.trunc(CjsBlueOS.Monotonic() * 1e6)));
}

/** Carbon's `CallbackMan` log channel (CallbackMan.cpp:10). */
const CALLBACKMAN_CHANNEL = CcpLog.CCP_LOG_DEFINE_CHANNEL("CallbackMan", "blue");

/** Gives each manager a serial, so its entries' saga ids never meet another manager's. */
let nextManagerSerial = 1;

/** The rejection a cancelled entry's promise gets. */
function createCancelledError(id)
{
  const error = new Error(`BlueCallbackMan: entry ${id} was cancelled.`);
  error.name = "AbortError";
  return error;
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

  /** Callback ids wrap as Carbon uint32 values. */
  _nextId = 1;

  _threadCount = 1;

  _isRunningOwnThreads = false;

  /** @type {BlueCallbackManThreadData[]} */
  _threads = [];

  _threadPriority = 0;

  _pauseCounter = 0;

  _stop = false;

  _timeInQueueMax = 0n;

  _timeInQueueTotal = 0n;

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

  /** Turns an entry's context into its label; see `SetEntryLabeler`. */
  _labeler = null;

  /** This manager's serial, which prefixes its entries' saga ids. */
  _serial = nextManagerSerial++;

  /** Module URL of each named callback, by name; see `RegisterCallbackModule`. */
  _callbackModules = new Map();

  /** Each callback module imported on this thread for `Update` mode, by URL. */
  _loadedModules = new Map();

  /** Named entries running on this thread in `Update` mode, by id. */
  _localEntries = new Map();

  /** Set by `Start`: when every worker dies before it loads, the entries move to `Update` mode. */
  _fallBackToUpdate = false;

  /**
   * Carbon's `CALLBACKMAN_DEBUGGING` (CallbackMan.cpp:12-22): when set, the
   * manager logs each entry it queues and processes on the `CallbackMan`
   * channel. Adapted: Carbon compiles the switch in, normally off; here it is
   * a flag a tool sets while it runs. The lines for Carbon's thread loop
   * (cpp:223-239) have no equivalent, because nothing here waits on a queue.
   */
  static CALLBACKMAN_DEBUGGING = false;

  /**
   * Carbon's `REPORT`: a `CallbackMan` channel line while
   * `CALLBACKMAN_DEBUGGING` is set, in Carbon's words.
   *
   * Adapted: the line also carries `CjsLogData` (CcpLog's `userData`): the
   * manager's name as subtitle, a saga id per entry, the entry's label and the
   * step it reports, plus that step's numbers. Carbon's lines name neither the
   * manager nor the job, and several managers share the channel.
   *
   * The entry is labelled only here, after the switch is checked, so a
   * labeler costs nothing while reporting is off.
   *
   * @param {number} id Entry id.
   * @param {?BlueCallbackEntry} entry The entry, for its label; null when only the id is known.
   * @param {string} event The step: queued, fenced, front, cancelling, started or done.
   * @param {object} fields The step's own numbers, merged into the data.
   * @param {string} format Carbon's printf format.
   * @param {...*} args Format arguments.
   * @returns {void}
   */
  _Report(id, entry, event, fields, format, ...args)
  {
    if (!BlueCallbackMan.CALLBACKMAN_DEBUGGING) return;
    const subtitle = this._name || "BlueCallbackMan";
    const label = entry === null ? null : this._LabelOf(entry);
    const data = { subtitle, saga: `BlueCallbackMan:${this._serial}:${id}`, label, event, ...fields };
    CcpLog.LogFuncChannel(CALLBACKMAN_CHANNEL, CcpLog.LogType.LOGTYPE_INFO, data, format, ...args);
  }

  /**
   * An entry's label: its callback name for a named entry, otherwise what the
   * manager's labeler makes of its context. Resolved once, the first time the
   * entry is reported.
   *
   * @param {BlueCallbackEntry} entry The entry.
   * @returns {?string} The label, or null when nothing names the entry.
   */
  _LabelOf(entry)
  {
    if (entry.label === undefined) entry.label = entry.name ?? (this._labeler === null ? null : this._labeler(entry.context));
    return entry.label;
  }

  /**
   * Gives the manager a function that names an entry from its context, for its
   * log lines.
   *
   * Ours: Carbon's entries are a function pointer and a context
   * (`AddToQueue( BRMQ_MAIN, StaticPrepareAsync, this, ... )`,
   * BlueAsyncRes.cpp:125), so a debugger names a job from which function ran on
   * which resource. JavaScript function names do not survive minification, so
   * the owner that queues entries names them: resMan's queues label each task
   * with its kind and path. A named entry is labelled by its callback name.
   *
   * @param {?function(*): ?string} labeler Called with an entry's context; null removes it.
   * @returns {BlueCallbackMan} This manager.
   */
  SetEntryLabeler(labeler)
  {
    if (labeler !== null && typeof labeler !== "function") throw new TypeError("BlueCallbackMan.SetEntryLabeler requires a function or null.");
    this._labeler = labeler;
    return this;
  }

  /**
   * `Add` (CallbackMan.cpp:94-146) - queues a callback run on the caller's
   * thread by `Update`.
   *
   * @adapted Carbon writes the id through its `CcpAtomic<uint32_t>*` out
   *   parameter; here `id`, when given, is an object whose `value` receives it.
   *   A function cannot be handed to a worker, so a manager running its own
   *   threads takes only named entries (`Add__Name`).
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
   * @adapted a worker cannot run a main-thread function or write into the
   *   caller's memory, so the entry names a callback the worker module exports,
   *   its context must be cloneable, and its result comes back as the promise's
   *   value. `transfer` lists buffers moved, not copied, into the worker.
   * @param {string} name Callback name exported by the worker module.
   * @param {*} [context=null] Cloneable context.
   * @param {number} [flags=IBlueCallbackMan.BCBF_NONE] `BCBF_*` flags.
   * @param {{value: number}|null} [id=null] Receives the entry id.
   * A manager not running its own threads runs a named entry on the caller's
   * thread through `Update`, from the module registered for the name. With no
   * module registered there is nothing to run it, so the promise rejects at
   * once instead of waiting for an `Update` that cannot run it. This fixes our
   * own adaptation; Carbon has no named entries.
   *
   * @param {Transferable[]} [transfer=[]] Buffers to move into the worker.
   * @returns {Promise<*>} The callback's result; rejects with an AbortError when cancelled.
   */
  Add__Name(name, context = null, flags = IBlueCallbackMan.BCBF_NONE, id = null, transfer = [])
  {
    if (typeof name !== "string" || name === "") throw new TypeError("BlueCallbackMan.Add__Name requires a callback name.");
    if (!this._isRunningOwnThreads && !this._callbackModules.has(name))
    {
      const error = new Error(`BlueCallbackMan: named entry "${name}" needs the own threads (Run) or a registered callback module.`);
      error.code = "CJS_CALLBACKMAN_NO_RUNNER";
      return Promise.reject(error);
    }

    return new Promise((resolve, reject) =>
    {
      this._AddHelper(null, name, context, transfer, flags, id, { resolve, reject });
    });
  }

  /**
   * Queues one entry; the body of Carbon's `Add` (cpp:98-143).
   *
   * @adapted
   */
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
      timeStamp: timestampTicks(),
      fenceMask: 0,
      completion,
      label: undefined
    };
    this._Report(entry.id, entry, "queued", {}, "Adding callback");

    // Adapted: Carbon fences only for its own threads (cpp:113); Update mode
    // there runs one entry at a time, so ordering holds by itself. Ours keeps
    // several async slots in Update mode, so a fence applies there too.
    if ((this._isRunningOwnThreads || this._threadCount > 1) && (flags & IBlueCallbackMan.BCBF_FENCE))
    {
      for (let i = 0; i < this._threadCount; ++i) entry.fenceMask |= 1 << i;
      this._Report(entry.id, entry, "fenced", {}, "Adding fenced entry");
    }

    if (flags & IBlueCallbackMan.BCBF_URGENT) this._urgentQueue.push(entry);
    else this._queue.push(entry);

    this._nextId = (this._nextId + 1) >>> 0;
    ++this._size;

    if (this._isRunningOwnThreads) this._Alarm();
  }

  /**
   * `Cancel` (CallbackMan.cpp:148-187) - removes a queued entry; for one in
   * progress, discards its outcome.
   *
   * @adapted Carbon blocks on the in-progress mutex until the callback
   *   finishes; nothing blocks here, so the returned promise settles then
   *   instead. A worker is also told, and stops the entry at its next yield.
   * @param {number} id Entry id.
   * @returns {Promise<void>} Settles once the entry is no longer running.
   */
  Cancel(id)
  {
    for (const td of this._threads)
    {
      if (id !== td.currentId) continue;

      // Callback being canceled is already in progress - wait for it to finish
      this._Report(id, null, "cancelling", {}, "Cancel waiting for callback to finish");
      td.currentId = 0;
      const pending = this._workerEntries.get(id);
      if (pending)
      {
        td.worker.postMessage({ kind: "cancel", id });
        pending.completion.reject(createCancelledError(id));
      }
      const local = this._localEntries.get(id);
      if (local)
      {
        local.controller.abort();
        local.completion.reject(createCancelledError(id));
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
   * @adapted each thread is a worker built from the module given to
   *   `SetWorkerModule`; there are no OS threads to create. A host may have no
   *   workers, or block them, so creating one can throw. The workers already
   *   created are then terminated and the manager is left not running before
   *   the error is rethrown. This fixes our own adaptation; Carbon's threads
   *   always start (CallbackMan.cpp:189-206).
   * @throws {Error} When no worker module is set, or a worker cannot be created.
   */
  Run()
  {
    if (this._workerModule === null) throw new Error("BlueCallbackMan.Run: no worker module set (SetWorkerModule).");
    if (this._isRunningOwnThreads) throw new Error("BlueCallbackMan.Run: the own threads are already running.");

    this._isRunningOwnThreads = true;
    this._stop = false;

    this._threads = [];
    try
    {
      for (let i = 0; i < this._threadCount; ++i)
      {
        const td = new BlueCallbackManThreadData(i);
        td.name = this._ThreadName(i);
        this._CreateWorker(td);
        this._threads.push(td);
      }
    }
    catch (error)
    {
      for (const td of this._threads) td.worker.terminate();
      this._threads = [];
      this._isRunningOwnThreads = false;
      throw error;
    }

    this._Alarm();
  }

  /**
   * Starts the manager on its own threads when it may, and runs its entries
   * through `Update` when it may not or they cannot start.
   *
   * Ours: Carbon's threads always start (ResourceLoading.cpp:85-91). A browser
   * may have no workers, block them, or fail to load their module, so the
   * manager falls back to `Update` mode: at once when `Run` throws, or later
   * when every worker fails before it has loaded. The owner ticks `Update`
   * for that mode, which runs one entry at a time (`_FallBackToUpdate`). The default worker module runs the callbacks registered
   * with `RegisterCallbackModule`. Starting a started manager does nothing.
   *
   * @param {boolean} useWorkers Whether the host allows workers.
   * @returns {BlueCallbackMan} This manager.
   */
  Start(useWorkers)
  {
    if (this._fallBackToUpdate) return this;
    this._fallBackToUpdate = true;
    if (!useWorkers)
    {
      this._FallBackToUpdate();
      return this;
    }

    if (this._workerModule === null) this._workerModule = new URL("./worker/blueCallbackManWorkerEntry.js", import.meta.url);
    try
    {
      this.Run();
    }
    catch (error)
    {
      console.warn(`BlueCallbackMan: ${this._name}: no worker could be created (${error.message}); entries run through Update.`);
      this._FallBackToUpdate();
    }
    return this;
  }

  /**
   * Leaves a started manager running its entries through `Update`, with one
   * slot: Carbon's `Update` runs one thread record whatever the thread count
   * (CallbackMan.cpp:303-315). Our named entries are asynchronous, so the
   * owner's time slice cannot see their work; the single slot is what keeps
   * the tick to one entry. Fence bits for threads that no longer exist are
   * cleared, or a fenced entry would wait for them forever.
   */
  _FallBackToUpdate()
  {
    this._threadCount = 1;
    for (const queue of [ this._urgentQueue, this._queue, this._fenceQueue ])
    {
      for (const entry of queue) entry.fenceMask &= 1;
    }
  }

  /**
   * Whether the manager runs its own threads, rather than `Update`.
   *
   * Ours: Carbon exposes no query; the owner of a manager started with
   * `Start` asks before ticking `Update`, which a manager on its own threads
   * refuses.
   *
   * @returns {boolean} True while the own threads run.
   */
  IsRunningOwnThreads()
  {
    return this._isRunningOwnThreads;
  }

  /**
   * Whether a module is registered for a named callback, so a caller can
   * decide to queue a job here or run it itself.
   *
   * Ours: Carbon's callers hold a function pointer and always can queue; a
   * named entry needs its module registered (`RegisterCallbackModule`).
   *
   * @param {string} name Callback name.
   * @returns {boolean} True when `RegisterCallbackModule` named a module for it.
   */
  HasCallbackModule(name)
  {
    return this._callbackModules.has(name);
  }

  /**
   * Registers the module that holds a named callback.
   *
   * Ours: Carbon's threads run function pointers already in the process. A
   * worker runs only code its module loaded, so a named entry carries its
   * module's URL, and the worker imports it the first time one of its
   * callbacks runs. `Update` mode imports the same URL on this thread, so both
   * run the same code. The module exports its callbacks as `callbacks`, by
   * name.
   *
   * The URL must come from code: the composition registering a module it
   * ships, resolved once with `new URL(spec, import.meta.url)`. Never pass a
   * URL from asset data or anything a user can influence; importing it runs
   * it.
   *
   * @param {string} name Callback name.
   * @param {string|URL} module Module URL.
   * @returns {BlueCallbackMan} This manager.
   */
  RegisterCallbackModule(name, module)
  {
    if (typeof name !== "string" || name === "") throw new TypeError("BlueCallbackMan.RegisterCallbackModule requires a callback name.");
    this._callbackModules.set(name, String(module));
    return this;
  }

  /**
   * `Stop` (CallbackMan.cpp:245-271) - stops the own threads.
   *
   * @adapted Carbon joins each thread; here the promise settles once every
   *   entry in progress has finished, then the workers are terminated.
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

  /**
   * `Pause` (CallbackMan.cpp:273-279) - no new entry starts until resumed.
   *
   * @adapted Carbon asserts the own threads. Here it also holds an `Update`-mode
   *   manager, whose `Update` starts nothing while paused, because resMan's
   *   background queue is not threaded and is paused through this.
   */
  Pause()
  {
    this._pauseCounter++;
  }

  /**
   * `Resume` (CallbackMan.cpp:281-295) - undoes one `Pause`.
   *
   * @adapted as `Pause`, it also serves an `Update`-mode manager. The last
   *   `Resume` wakes the own threads through the alarm, as Carbon's semaphore
   *   does; in `Update` mode it calls the slot-free callback instead, the
   *   owner's stand-in for that semaphore (see `SetSlotFreeCallback`).
   */
  Resume()
  {
    const pauseCounter = this._pauseCounter;
    if (pauseCounter > 0) this._pauseCounter--;
    if (pauseCounter !== 1) return;

    if (this._isRunningOwnThreads) this._Alarm();
    else if (this._onSlotFree !== null) this._onSlotFree();
  }

  /**
   * `IsPaused` (CallbackMan.cpp:297-301).
   *
   * @implemented
   */
  IsPaused()
  {
    return this._pauseCounter > 0;
  }

  /**
   * `Throttle` (CallbackMan.h:53) - a no-op; a subclass overrides it.
   *
   * @implemented
   */
  Throttle() {}

  /**
   * `Unthrottle` (CallbackMan.h:57) - a no-op; a subclass overrides it.
   *
   * @implemented
   */
  Unthrottle() {}

  /**
   * `Update` (CallbackMan.cpp:303-316) - processes the next entry on the
   * caller's thread.
   *
   * @adapted an asynchronous entry holds its slot until it settles, so the
   *   manager keeps `SetThreadCount` slots for `Update` too; Carbon keeps one,
   *   which a synchronous callback always frees before the next call. Idle
   *   slots take turns, so each one checks the fence queue as Carbon's threads
   *   do; always taking the first idle slot would leave the others' fence bits
   *   set while regular entries keep coming. A paused manager starts nothing
   *   (see `Pause`).
   * @returns {boolean} Whether an entry was started.
   */
  Update()
  {
    if (this._isRunningOwnThreads) throw new Error("BlueCallbackMan.Update: the manager runs its own threads.");
    if (this._pauseCounter > 0) return false;

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
   *
   * @adapted
   */
  _UpdateThread(td)
  {
    let entry = null;
    let processedFenceEntry = false;

    if (this._fenceQueue.length)
    {
      const fencedEntry = this._fenceQueue[0];
      const maskBefore = fencedEntry.fenceMask;
      fencedEntry.fenceMask &= ~(1 << td.threadIndex);

      if (fencedEntry.fenceMask && !this._urgentQueue.length && !this._queue.length)
      {
        for (let i = 0; i < this._threadCount; ++i)
        {
          const otherThreadData = this._threads[i];
          if (otherThreadData !== td && otherThreadData.currentId === 0) fencedEntry.fenceMask &= ~(1 << i);
        }
      }

      this._Report(fencedEntry.id, fencedEntry, "front", { maskBefore, mask: fencedEntry.fenceMask },
        "Front of fenced queue - %x - %x", maskBefore, fencedEntry.fenceMask);

      // A surplus slot left by a lowered thread count has no fence bit; the fence waits for it too.
      if (fencedEntry.fenceMask === 0 && !this._threads.some(other => other.threadIndex >= this._threadCount && other.inProgress !== null))
      {
        entry = this._fenceQueue.shift();
        processedFenceEntry = true;
      }
    }

    // Note that size of queue is not decreased until after processing callback.
    let kind = "fenced";
    if (!entry)
    {
      entry = this._ExtractFromQueue(this._urgentQueue, td.threadIndex);
      kind = "urgent";
    }
    if (!entry)
    {
      entry = this._ExtractFromQueue(this._queue, td.threadIndex);
      kind = "regular";
    }

    if (!entry)
    {
      if (processedFenceEntry) this._Alarm();
      return false;
    }

    td.currentId = entry.id;
    const started = CjsBlueOS.Monotonic();
    const threadName = this._isRunningOwnThreads ? td.name : BlueThreadMonitor.MAIN_THREAD;
    this._Report(entry.id, entry, "started",
      { kind, thread: threadName, waited: Number(timestampTicks() - entry.timeStamp) / 1e9 },
      "Processing %s entry %d on thread %d", kind, entry.id, td.threadIndex);

    // The thread works for the entry (CallbackMan.cpp:322, ScopedThreadStatus).
    // A worker's entry runs until its answer arrives, so its status is
    // reported for it by name and restored in `finish`; an Update entry marks
    // this thread for the synchronous part, as Carbon's scope does.
    if (this._isRunningOwnThreads)
    {
      const previousStatus = BeThreadMonitor.SetThreadStatus__Thread(td.name, IBlueThreadMonitor.BTS_WORKING);
      return this._ProcessEntry(td, entry, processedFenceEntry, td.name, previousStatus, started, threadName);
    }
    const threadStatus = new ScopedThreadStatus(IBlueThreadMonitor.BTS_WORKING);
    try
    {
      return this._ProcessEntry(td, entry, processedFenceEntry, null, 0, started, threadName);
    }
    finally
    {
      threadStatus.Destruct();
    }
  }

  /**
   * The rest of `UpdateThread` (CallbackMan.cpp:396-441): runs the entry taken
   * for a thread.
   *
   * @param {BlueCallbackManThreadData} td The thread.
   * @param {BlueCallbackEntry} entry The entry taken for it.
   * @param {boolean} processedFenceEntry Whether the entry came from the fence queue.
   * @param {?string} thread The worker whose status to restore when the entry settles, or null for this thread.
   * @param {number} previousStatus That worker's status before the entry.
   * @param {number} started When the entry started, in milliseconds (`CjsBlueOS.Monotonic`).
   * @param {string} threadName The thread's name, for the entry's log lines.
   * @returns {boolean} True: an entry was started.
   */
  _ProcessEntry(td, entry, processedFenceEntry, thread, previousStatus, started, threadName)
  {
    const delta = timestampTicks() - entry.timeStamp;
    if (delta > 0n)
    {
      if (delta > this._timeInQueueMax) this._timeInQueueMax = delta;
      this._timeInQueueTotal = BigInt.asUintN(64, this._timeInQueueTotal + delta);
      this._entriesProcessed = (this._entriesProcessed + 1) >>> 0;
      this._timeInQueueAverage = Number(this._timeInQueueTotal) / this._entriesProcessed;
    }

    const finish = () =>
    {
      const seconds = (CjsBlueOS.Monotonic() - started) / 1000;
      this._Report(entry.id, entry, "done", { thread: threadName, seconds },
        "<<Processing callback done - %g seconds", seconds);
      if (thread !== null) BeThreadMonitor.SetThreadStatus__Thread(thread, previousStatus);
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
      if (this._isRunningOwnThreads)
      {
        // A worker that failed is replaced when its slot is next given work.
        if (td.worker === null) this._CreateWorker(td);
        td.inProgress = this._RunOnWorker(td, entry).then(finish, finish);
        return true;
      }
      if (this._callbackModules.has(entry.name))
      {
        td.inProgress = this._RunOnThisThread(td, entry).then(finish, finish);
        return true;
      }
      // Nothing can run it here; it fails rather than hold its place.
      entry.completion.reject(new Error(`BlueCallbackMan: named entry "${entry.name}" needs the own threads (Run) or a registered callback module.`));
      finish();
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
      const module = this._callbackModules.get(entry.name) ?? null;
      td.worker.postMessage({ kind: "run", id: entry.id, name: entry.name, module, context: entry.context }, entry.transfer);
    });
  }

  /**
   * Runs a named entry on this thread, from its registered module, for
   * `Update` mode. A cancelled entry's outcome is discarded, as on a worker
   * (cpp:405); one cancelled while its module loads does not run.
   */
  async _RunOnThisThread(td, entry)
  {
    const controller = new AbortController();
    this._localEntries.set(entry.id, { completion: entry.completion, controller });
    try
    {
      const module = await this._LoadCallbackModule(this._callbackModules.get(entry.name));
      if (controller.signal.aborted) return;
      const callback = module.callbacks[entry.name];
      if (typeof callback !== "function") throw new Error(`BlueCallbackMan: module ${this._callbackModules.get(entry.name)} exports no callback "${entry.name}".`);
      const result = await callback(entry.context, { signal: controller.signal });
      if (td.currentId === entry.id) entry.completion.resolve(result);
    }
    catch (error)
    {
      if (td.currentId === entry.id) entry.completion.reject(error);
    }
    finally
    {
      this._localEntries.delete(entry.id);
    }
  }

  /** Imports a registered callback module once on this thread; see `RegisterCallbackModule`. */
  _LoadCallbackModule(url)
  {
    let loading = this._loadedModules.get(url);
    if (!loading)
    {
      loading = import(url);
      this._loadedModules.set(url, loading);
    }
    return loading;
  }

  /** A worker's answer for the entry it was given. */
  _OnWorkerMessage(td, message)
  {
    // A worker reports once that its module loaded; one failing before that never ran anything.
    if (message.kind === "ready")
    {
      td.ready = true;
      return;
    }
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
   *
   * On a manager started with `Start`, a worker failing before it reported
   * ready never loaded (a blocked or missing module), so a replacement would
   * fail the same way. Its thread is dead instead: the entry it holds goes
   * back to the front of the queue for another thread, and when every thread
   * is dead the manager falls back to `Update` mode.
   */
  _OnWorkerFailure(td, event)
  {
    if (td.worker !== null)
    {
      td.worker.terminate();
      td.worker = null;
    }
    if (this._fallBackToUpdate && !td.ready)
    {
      this._OnThreadDead(td, event);
      return;
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

  /** A worker that never loaded: requeue what it held, and fall back once no thread is left. */
  _OnThreadDead(td, event)
  {
    td.dead = true;
    console.warn(`BlueCallbackMan: worker ${td.name} failed to load: ${event.message || event.type || "error"}`);

    const pending = this._workerEntries.get(td.workerEntryId);
    td.workerEntryId = 0;
    if (pending)
    {
      this._workerEntries.delete(pending.entry.id);
      // Not run yet, so it goes ahead of the waiting entries, in id order among
      // others handed back; a cancelled one has already been rejected and is dropped.
      if (td.currentId === pending.entry.id)
      {
        const before = this._urgentQueue.findIndex(other => other.id > pending.entry.id);
        this._urgentQueue.splice(before === -1 ? this._urgentQueue.length : before, 0, pending.entry);
        ++this._size;
      }
      pending.settle();
    }

    if (!this._threads.every(thread => thread.dead)) return;

    console.warn(`BlueCallbackMan: ${this._name}: no worker loaded; entries run through Update.`);
    this._threads = [];
    this._isRunningOwnThreads = false;
    this._FallBackToUpdate();
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
          if (td.dead || td.inProgress !== null || td.currentId !== 0) continue;
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

  /**
   * `IsEmpty` (CallbackMan.cpp:470-473).
   *
   * @implemented
   */
  IsEmpty()
  {
    return this._size === 0;
  }

  /**
   * `GetNextId` (CallbackMan.cpp:520-523).
   *
   * @implemented
   */
  GetNextId()
  {
    return this._nextId;
  }

  /**
   * `GetSize` (CallbackMan.cpp:515-518).
   *
   * @implemented
   */
  GetSize()
  {
    return this._size;
  }

  /**
   * How many of the `GetSize` entries are running: the slots holding one.
   *
   * Ours: Carbon has no such count; its threads record what they run in
   * `m_currentId` (CallbackMan.cpp:158), and nothing reads them all. A slot is
   * busy while its entry is in progress, including an entry `Cancel` has let go
   * of but that has not finished yet, since it still holds the slot.
   *
   * @returns {number} The busy slots.
   */
  GetActiveCount()
  {
    const threads = this._threads;
    let active = 0;
    for (let i = threads.length; i--;) if (threads[i].inProgress !== null) active++;
    return active;
  }

  /**
   * `GetTimeInQueueMax` (CallbackMan.cpp:444-451), in seconds.
   *
   * @implemented
   */
  GetTimeInQueueMax()
  {
    return Math.fround(Number(this._timeInQueueMax) / 1e9);
  }

  /**
   * `GetTimeInQueueAverage` (CallbackMan.cpp:453-460), in seconds.
   *
   * @implemented
   */
  GetTimeInQueueAverage()
  {
    return Math.fround(this._timeInQueueAverage / 1e9);
  }

  /**
   * `ResetQueueStats` (CallbackMan.cpp:462-468).
   *
   * @implemented
   */
  ResetQueueStats()
  {
    this._timeInQueueAverage = 0;
    this._timeInQueueMax = 0n;
    this._timeInQueueTotal = 0n;
    this._entriesProcessed = 0;
  }

  /**
   * `SetPriority` (CallbackMan.cpp:475-491) - clamped to Carbon's range and
   * stored.
   *
   * @adapted a browser gives a worker no priority, so the value has no effect.
   * @param {number} priority `CCP_THREAD_PRIORITY_*`, -2 to 2.
   */
  SetPriority(priority)
  {
    this._threadPriority = Math.min(CCP_THREAD_PRIORITY_HIGHEST, Math.max(CCP_THREAD_PRIORITY_LOWEST, priority));
  }

  /**
   * `SetThreadCount` (CallbackMan.cpp:84-92) - at most 32.
   *
   * @implemented
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
   * @adapted a worker's name is fixed when it is created, so a name set after
   *   `Run` names the next run's workers.
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
   * @adapted returns the removed entry rather than true, so `Cancel` can
   *   reject a named entry's promise.
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
   *
   * @adapted
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

  /** Carbon BlueCallbackMan::ThreadData (private, CallbackMan.h:124-148). */
  static ThreadData = BlueCallbackManThreadData;
}

CjsSchema.exposure.mapInterface(IBlueCallbackMan)(BlueCallbackMan);
be.define("BlueCallbackMan")(BlueCallbackMan);


/**
 * `BeCallbackMan` (ResourceLoading.cpp:24, :81-91) - the global background
 * callback manager. Carbon creates and runs it at startup; here the
 * orchestrator gives it a worker module and a thread count, then runs it.
 */
export const BeCallbackMan = new BlueCallbackMan();
BeCallbackMan.SetName("BeCallbackMan");
