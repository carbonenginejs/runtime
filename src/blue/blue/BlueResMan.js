import { requireRegisteredClassName } from "../compose/className.js";
import { StreamType } from "#consts/media";
// Source: blue/src/BlueResMan.h
// Source: blue/src/BlueResMan.cpp
// Consumer interface: blue/include/IBlueResMan.h (see IBlueResMan.js).
import { assertNonNegativeInteger, assertNonNegativeNumber, assertPositiveInteger } from "#utils/validation";
import { MotherLode, getMotherLodeKey } from "./MotherLode.js";
import { BlueOS } from "./BlueOS.js";
import { blue as blueService } from "./blue.js";
import { CjsLoadingObject } from "./CjsLoadingObject.js";
import { IBlueCallbackMan } from "./IBlueCallbackMan.js";
import { CjsSchema, meta, blue } from "#schema";
import { BlueResManQueue, IBlueResMan } from "./IBlueResMan.js";
import { IBlueEvents } from "./IBlueEvents.js";
import { IRoot } from "../blueexposure/IRoot.js";
import { IBlueResource } from "./IBlueResource.js";
import * as CcpLog from "../../global/logging/ccpLog.js";
import { hasOwnThen } from "#utils/object";
import {
  getResourceExtension,
  normalizePath,
  normalizeResourceExtension,
  normalizeResourcePath
} from "#utils/path";


import { GetResources } from "./getResources.js";
import { ResourceHandlerMode } from "../../global/consts/resourceHandlerMode.js";
import { BlueCallbackMan } from "./BlueCallbackMan.js";
import {
  CjsResManMainThreadLoader
} from "./worker/CjsResManMainThreadLoader.js";
import {
  CjsResManWorkerLoader
} from "./worker/CjsResManWorkerLoader.js";
/** @type {WeakMap<object, CjsResourceReadContext>} */
const READ_CONTEXTS = new WeakMap();

/** `s_ch = CCP_LOG_DEFINE_CHANNEL( "ResMan" )` (BlueResMan.cpp:31): resMan's log channel. */
const s_ch = CcpLog.CCP_LOG_DEFINE_CHANNEL("ResMan", "blue");

/** BLUEQIOPT::BEQI_SILENT (BlueTypes.h); avoids the BlueClasses service import cycle. */
const BEQI_SILENT = 1;

/** Small request fields retained only so a released payload can be rebuilt. */
const RESOURCE_REQUEST_OPTION_KEYS = [
  "ex",
  "variant",
  "emit",
  "outputStreams",
  "format",
  "classes",
  "formatOptions"
];

/** Requested-output fields pinned by a bound resource handle. */
const RESOURCE_OUTPUT_OPTION_KEYS = [
  "ex",
  "outputStreams",
  "variant",
  "emit"
];

/** Source provenance retained by a bound resource handle when present. */
const RESOURCE_PROVENANCE_OPTION_KEYS = [
  "source",
  "sourceRevision",
  "ext"
];

/** Process-local tokens used only by parsed-format operation caching. */
const LOCAL_VALUE_IDENTITIES = new WeakMap();
let nextLocalValueIdentity = 1;

/**
 * Immutable source provenance used by one read/format operation chain.
 *
 * `sourceRevision` is caller/source-provided opaque content identity. It scopes
 * read caches only and never becomes part of MotherLode resource identity.
 *
 * @typedef {object} CjsResourceReadContext
 * @property {BlueResMan} resMan Owning manager.
 * @property {object|Function} source Selected source implementation.
 * @property {string} path Normalized Carbon-style source path.
 * @property {string} resFilePath Normalized lowercase Carbon-style source path.
 * @property {string} ext Normalized lowercase resource extension.
 * @property {string} fileName Normalized lowercase final path component.
 * @property {string|null} url Exact URL passed to a URL-backed source, otherwise `null`.
 * @property {string} sourcePath Resource path or URL passed to the selected source.
 * @property {string|number|undefined} sourceRevision Caller content token.
 * @property {string} revisionKey Type-stable internal form of the content token.
 */

/**
 * Mutable record retained in a source or format operation ledger.
 *
 * @typedef {object} CjsResourceReadOperationRecord
 * @property {Promise<*>} promise Shared operation promise.
 * @property {string} path Normalized source path used for explicit invalidation.
 * @property {string} revisionKey Type-stable source revision key.
 * @property {boolean} retain Whether any joined caller requested settled retention.
 */

/**
 * Source provenance and tri-state read-cache controls.
 *
 * Omitted cache flags share in-flight or explicitly retained work but do not
 * retain a newly completed operation. `true` retains success, while `false`
 * bypasses sharing and retention. Failures are never retained.
 *
 * @typedef {object} CjsResManReadCacheOptions
 * @property {object|Function} [source] Source override providing `Read(path, options)`.
 * @property {string|number} [sourceRevision] Opaque caller/source content token; finite numbers only.
 * @property {boolean} [reload=false] Invalidate this source/path and begin fresh work once.
 * @property {boolean} [cacheSource] Source operation sharing/retention policy.
 * @property {boolean} [cacheFormat] Parsed-format operation sharing/retention policy.
 */

/**
 * Opt-in time-based inactivity policy run by {@link BlueResMan#Update}.
 *
 * Automatic policy deliberately uses elapsed milliseconds rather than
 * MotherLode activity frames: the latter count explicit activity observations
 * and are not guaranteed to match renderer frames. At least one identity or
 * payload limit is required. The policy is disabled by default.
 *
 * @typedef {object} CjsResManAutoPurgePolicy
 * @property {number} [intervalMilliseconds=1000] Minimum elapsed milliseconds between automatic sweeps; `0` permits every update.
 * @property {number} [maxIdleMilliseconds] Elapsed milliseconds after which an unlocked canonical identity is removed and cleaned.
 * @property {number} [payloadMaxIdleMilliseconds] Elapsed milliseconds after which an unlocked CPU payload is released.
 * @property {boolean} [destroyAdapters=true] Whether identity cleanup destroys adapter allocations.
 * @property {boolean} [releasePayload=true] Whether sweeps may release CPU payloads.
 * @property {false|Function} [cleanup] `false` retains owned state; a function replaces default identity cleanup.
 * @property {() => number} [now=Date.now] Cadence clock. Use the MotherLode activity clock when supplying a custom clock.
 */

/**
 * Per-call controls for {@link BlueResMan#PumpAutoPurge}.
 *
 * @typedef {object} CjsResManAutoPurgePumpOptions
 * @property {number} [time] Explicit non-negative timestamp in milliseconds for deterministic pumping and sweeping.
 */

/**
 * Queue and automatic-purge controls accepted by {@link BlueResMan#Update}.
 * Top-level `maxTime` and `now` remain a compatibility form for `prepare`.
 *
 * @typedef {object} CjsResManUpdateOptions
 * @property {{maxTime?: number, now?: Function}} [prepare] The prepare loop's time slice in seconds (default
 *   `maxPrepareTime`) and a millisecond clock.
 * @property {false|object} [cache] `false` skips recorded-byte housekeeping; otherwise supplies cache-cleanup policy.
 * @property {false|CjsResManAutoPurgePumpOptions} [purge] `false` skips this update's automatic sweep; otherwise supplies its timestamp.
 */

/**
 * Controls accepted by {@link BlueResMan#Wait}.
 *
 * By default `Wait` pumps both queues, honouring their pause state.
 * `pump: false` leaves all progress to an external driver. The yield callback
 * runs between checks and may return either a promise or an immediate value.
 *
 * @typedef {object} CjsResManWaitOptions
 * @property {boolean} [pump=true] Whether this call pumps the two queues while it waits.
 * @property {() => (*|Promise<*>)} [yield] Cooperative wait between checks.
 */

// `dynamic:` protocol (BlueResMan.cpp:219-223): the name is the segment after
// this prefix, and everything after the following slash is the query. Carbon
// accepts both separators after the scheme (BlueFileUtil.cpp:33), and both are
// nine characters, so the split below is the same either way.
const DYNAMIC_RESOURCE_PREFIXES = [ "dynamic:/", "dynamic:\\" ];
const DYNAMIC_PREFIX_LENGTH = 9;

/**
 * Whether a normalized path names a dynamic resource.
 *
 * @param {string} key Normalized resource path.
 * @returns {boolean}
 */
function isDynamicResourcePath(key)
{
  return DYNAMIC_RESOURCE_PREFIXES.some(prefix => key.startsWith(prefix));
}

/**
 * Carbon logs and returns null for an unknown dynamic name or a constructor that
 * yields nothing (BlueResMan.cpp:225-235). There is no log channel here, and a
 * null handle breaks every caller that composes on GetResource, so the same
 * condition is raised, named.
 *
 * @param {string} path Normalized dynamic path.
 * @param {string} name Constructor name.
 * @param {string} code Error code.
 * @param {string} message Error message.
 * @returns {Error}
 */
/** A watch rejection naming the resources still pending. */
function watchError(code, message, pending)
{
  const error = new Error(`BlueResMan ${message}`);
  error.code = code;
  error.pending = pending.map(resource => resource.GetPath());
  return error;
}

function dynamicResourceError(path, name, code, message)
{
  const error = new Error(`BlueResMan ${message} (${path})`);
  error.code = code;
  error.path = path;
  error.name = "CjsResManDynamicResourceError";
  error.constructorName = name;
  return error;
}

/**
 * GPU-free resource manager that resolves paths through registered sources and
 * formats, caches handles in MotherLode, and drives native asynchronous loading
 * and preparation. Reload refills the same handle; attempt tokens prevent a
 * cancelled read from publishing late. Plain/object data belongs to this manager,
 * while each resource family owns its native data.
 *
 * Carbon: BlueResMan (blue/src/BlueResMan.h:21)
 */
export class BlueResMan
{

  // The manager is no longer reachable from itself. Carbon's process-wide
  // handle is an extern beside the interface it points at, not a static on
  // the implementation (`blue/include/IBlueResMan.h:135`), and the port of
  // that is `blue.resMan`. The static slot here was never installed by
  // anything in src, so every consumer received null and silently skipped
  // its acquisition.
  //
  // The res-file existence oracle went with it, to `blue.paths`, where
  // Carbon keeps it: FileExistsLocally is IBluePaths.h:38, a different
  // service behind a different extern.

  /**
   * The resource cache: Carbon's process-wide `BeMotherLode`, which
   * `GetResource` looks resources up in and inserts them into
   * (BlueResMan.cpp:183,242,288). Register may replace it.
   */
  motherLode = new MotherLode();

  /**
   * `m_loadObjectCache.SetCacheSize( 1*1024*1024 )` (BlueResMan.cpp:91): the
   * load-object cache's byte budget. Carbon's value, not measured for ours:
   * our recorded bytes are not Carbon's builder sizes.
   */
  loadObjectCacheSize = 1024 * 1024;

  /**
   * `PMotherLode m_loadObjectCache` (BlueResMan.h:123): LoadObject's own cache,
   * one builder per file, apart from MotherLode, so a resource lookup never
   * finds a loading object (BlueResMan.cpp:722-773). Carbon's is a second
   * MotherLode, and so is ours: its entries keep the same keep-alive, load
   * lock, trim, opt-in idle sweep and revival as `motherLode`'s. It reads
   * `motherLode`'s clock, because the manager stamps one activity time on
   * every handle (`activityTime`).
   */
  loadObjectCache = createLoadObjectCache(this.loadObjectCacheSize, () => this.motherLode.GetActivityTime());

  /** Default source for later requests, or null for blue.paths (SetSource). */
  source = null;


  /** Object loaders keyed by extension (RegisterObjectLoader). */
  objectLoaders = new Map();

  /** Format registrations keyed by extension (RegisterFormat). */
  formats = new Map();


  /** In-flight source reads, deduplicated per resource. Clear() replaces it. */
  sourceOperations = new WeakMap();

  /** In-flight format reads, deduplicated per resource. Clear() replaces it. */
  formatOperations = new WeakMap();

  /** Direct execution strategy (SetMainThreadLoader). */
  mainThreadLoader = new CjsResManMainThreadLoader();

  /** Worker execution strategy, falling back to the main-thread loader; null when removed. */
  workerLoader = new CjsResManWorkerLoader({ fallback: this.mainThreadLoader });

  /** The selected execution strategy: the worker loader or the main-thread loader. */
  resourceLoader = this.workerLoader;

  /**
   * Background-queue concurrency, the configuration input for Carbon's
   * `SetLoadingThreadCount` (BlueResMan.cpp:520-528), which sets it.
   */
  maxConcurrentLoads = 8;

  /**
   * Main-thread prepare time slice in seconds. The value of Carbon's
   * `m_mainThreadTimeSlice( 0.005f )` (BlueResMan.cpp:77).
   */
  maxPrepareTime = 0.005;

  /**
   * `m_maxAllowedInPrepareQueue( 256 )` (BlueResMan.cpp:84): `Update` keeps
   * preparing past its time slice while more than this many are waiting
   * (BlueResMan.cpp:463).
   */
  maxAllowedInPrepareQueue = 256;

  /** `m_pendingLoads` (BlueResMan.cpp:79): the background queue's size at the last `Update`. */
  pendingLoads = 0;

  /** `m_pendingPrepares` (BlueResMan.cpp:80): the main queue's size at the last `Update`. */
  pendingPrepares = 0;

  /** `m_loadQueueTimeAverage` (BlueResMan.cpp:85): seconds, from the background queue at the last `Update`. */
  loadQueueTimeAverage = 0;

  /** `m_loadQueueTimeMax` (BlueResMan.cpp:86): seconds, from the background queue at the last `Update`. */
  loadQueueTimeMax = 0;

  /** `m_prepareQueueTimeAverage` (BlueResMan.cpp:87): seconds, from the main queue at the last `Update`. */
  prepareQueueTimeAverage = 0;

  /** `m_prepareQueueTimeMax` (BlueResMan.cpp:88): seconds, from the main queue at the last `Update`. */
  prepareQueueTimeMax = 0;

  /** `m_preparesHandledLastTick` (BlueResMan.cpp:81): prepares the last `Update` ran. */
  preparesHandledLastTick = 0;

  /** `m_preparesHandledPerTickMax` (BlueResMan.cpp:82): the most prepares one `Update` has run. */
  preparesHandledPerTickMax = 0;

  /** `m_preparesHandledTotal` (BlueResMan.cpp:83): prepares run by every `Update`. */
  preparesHandledTotal = 0;

  /** `m_mainThreadMaxTime` (BlueResMan.cpp:78): the longest prepare loop of one `Update`, in seconds. */
  mainThreadMaxTime = 0;

  /** `m_urgentResourceLoads( false )` (BlueResMan.h:128, BlueResMan.cpp:73). */
  urgentResourceLoads = false;

  _autoPurgePolicy = null;
  _activeResourceOperations = 0;

  _lastAutoPurgeTime = null;

  /** Urgent loads, reloads and reads while pending (WaitUrgent). */
  _urgentOperations = new Set();


  _extensionRoutes = new Map();
  _resourceExtensionRoutes = new WeakMap();

  // BlueResMan::m_dynamicConstructors (BlueResMan.h:154-155).
  _dynamicConstructors = new Map();
  _dynamicResources = new WeakSet();
  /** Objects waiting for every resource they reach to finish (`Watch`). */
  _watches = [];
  // Carbon caches a LoadObject BUILDER and creates a new object per call
  // (BlueResMan.cpp:653-795). For an OBJECT-mode route that hydrates, the
  // payload is the decoded plain values - the builder - and this records what
  // builds from them.
  _objectBuilders = new WeakMap();

  /**
   * The default source: the file through blue.paths, the bytes Carbon's
   * DoOpenStream gets from BePaths->GetStreamFromPathW.
   */
  _bluePathsSource = { Read: (path, readOptions = {}) => readThroughBluePaths(blueService.paths, path, readOptions) };

  /**
   * Loaders registered through RegisterObjectBuilder: their result is a
   * builder, kept as the payload, never handed to a caller.
   */
  _objectBuilderLoaders = new WeakSet();

  /**
   * The handles held by `loadObjectCache` rather than `motherLode`.
   * `_GetLoadingObject` adds each one, and `_LodeOf` reads this set, so the
   * lifecycle code both caches share finds the right lode for a handle.
   *
   * @cjs
   * @implemented
   */
  _objectLoads = new WeakSet();

  /** Whether a background-queue pump is already scheduled. */
  _backgroundPumpScheduled = false;

  /**
   * `m_threadQueues[BRMQ_COUNT]` (BlueResMan.h:132): the callback managers,
   * indexed by `BlueResManQueue` and used as `m_threadQueues[BRMQ_MAIN]` and
   * `m_threadQueues[BRMQ_BACKGROUND]` (BlueResMan.cpp:100-110).
   *
   * Adapted: Carbon's background slot is the process-wide `BeCallbackMan`
   * (BlueResMan.cpp:110), whose threads block on a quick local read. Ours is
   * resMan's own manager in `Update` mode, whose async slots wait on the
   * network, so loads in flight have their own count (`SetLoadingThreadCount`).
   * Neither runs its own threads. The main queue runs only in `Update`, each
   * frame, as Carbon's (BlueResMan.cpp:439-464). The background queue refills
   * as soon as a slot frees: its slot-free callback, which `Resume` also
   * calls, stands in for its threads' semaphore.
   */
  _threadQueues = createThreadQueues(
    this.maxConcurrentLoads,
    () => this.ScheduleBackgroundQueue()
  );

  /**
   * Create a GPU-free resource manager and apply its initial registration.
   *
   * @param {object} [options={}] Configuration forwarded to {@link BlueResMan#Register}.
   * @throws {TypeError} If registration, queue, source, or format options are invalid.
   */
  constructor(options = {}) {
    this.Register(options);
  }

  /**
   * Add or replace resource-manager configuration.
   *
   * The same options object can be forwarded unchanged by CjsLibrary. Format
   * classes own their input extensions; resource factories are selected by the
   * source extension plus Carbon's explicit request suffix.
   * Replacing MotherLode shuts down and cleans the former owner before the new
   * registry is activated. Replacement is rejected while queued or direct
   * resource mutations are active so a synchronous configuration call cannot
   * detach ownership underneath asynchronous publication. Normal `Wait()`
   * drains queued roots only; direct callers must await their own promises.
   *
   * @cjs
   * @implemented
   * @param {object} [options={}] Additive source, registry, queue, format, and extension settings.
   * @param {number} [options.cacheSize] Recorded-byte budget immediately installed on the active MotherLode.
   * @param {object} [options.cacheCleanup] Cleanup policy used if a smaller configured budget evicts cached identities.
   * @param {object} [options.mainThreadLoader] Direct execution strategy.
   * @param {object|Map|object[]} [options.extensions] Extension route registrations.
   * @param {CjsResManWorkerLoader|null} [options.workerLoader] Worker loader.
   * @param {boolean} [options.useWorkerLoading=true] Whether worker-backed execution is selected.
   * @returns {BlueResMan} This resource manager.
   * @throws {TypeError} If options or any configured component are invalid.
   * @throws {Error|AggregateError} If resource mutations are active or replacing MotherLode cannot clean its resources.
   */
  Register(options = {})
  {
    if (!options || typeof options !== "object" || Array.isArray(options))
    {
      throw new TypeError("BlueResMan.Register options must be an object.");
    }

    hasOwnThen(options, {
      motherLode: value =>
      {
        const nextMotherLode = value || new MotherLode();
        if (nextMotherLode !== this.motherLode)
        {
          if (this._activeResourceOperations > 0)
          {
            throw activeResourceOperationsError(this._activeResourceOperations);
          }
          const previousMotherLode = this.motherLode;

          previousMotherLode.Shutdown();
          this.motherLode = nextMotherLode;
          this.motherLode.Startup();


          this._lastAutoPurgeTime = null;
        }
      },
      cacheSize: value => this.motherLode.SetCacheSize(
        value,
        options.cacheCleanup || {}
      ),
      loadObjectCacheSize: value =>
      {
        assertNonNegativeInteger(value, "BlueResMan loadObjectCacheSize");
        this.loadObjectCacheSize = value;
        this.loadObjectCache.SetCacheSize(value, options.cacheCleanup || {});
      },
      autoPurgePolicy: this.SetAutoPurgePolicy,
      source: this.SetSource,
      mainThreadLoader: this.SetMainThreadLoader,
      workerLoader: this.SetWorkerLoader,
      useWorkerLoading: this.UseWorkerLoading,
      maxConcurrentLoads: value =>
      {
        assertPositiveInteger(value, "BlueResMan maxConcurrentLoads");
        this.SetLoadingThreadCount(value);
      },
      maxPrepareTime: value =>
      {
        assertNonNegativeNumber(value, "BlueResMan maxPrepareTime");
        this.maxPrepareTime = value;
      },
      maxAllowedInPrepareQueue: value =>
      {
        assertNonNegativeInteger(value, "BlueResMan maxAllowedInPrepareQueue");
        this.maxAllowedInPrepareQueue = value;
      },
      urgentResourceLoads: this.SetUrgentResourceLoads
    }, this);

    for (const entry of normalizeRegistrationEntries(options.formats))
    {
      if (typeof entry === "function") this.RegisterFormat(entry);
      else this.RegisterFormat(entry.Format || entry.format, entry.defaults || {});
    }
    for (const [ ext, loader ] of Object.entries(options.objectLoaders || {}))
    {
      this.RegisterObjectLoader(ext, loader);
    }
    for (const [ ext, registration ] of normalizeExtensionRegistrationEntries(options.extensions))
    {
      const { Handler, handler, ...routeOptions } = registration;
      this.RegisterExtension(ext, Handler || handler, routeOptions);
    }
    return this;
  }

  /**
   * Replace the default source selected by later resource requests.
   * Existing handles retain the effective source captured when they were
   * created, so payload reconstruction does not silently move to this source.
   *
   * @param {object|Function|null} source Source exposing `Read(path, options)`, or a falsey value to clear the default.
   * @returns {BlueResMan} This resource manager.
   */
  SetSource(source) {
    this.source = source || null;
    return this;
  }

  /**
   * Replace the direct execution strategy used by unsupported worker
   * operations and whenever worker loading is not selected.
   *
   * @param {CjsResManMainThreadLoader} loader The main-thread loader.
   * @returns {BlueResMan} This resource manager.
   */
  SetMainThreadLoader(loader) {
    const wasSelected = this.resourceLoader === this.mainThreadLoader;
    this.mainThreadLoader = loader;
    this.workerLoader?.SetFallback(loader);
    if (wasSelected || !this.resourceLoader) this.resourceLoader = loader;
    return this;
  }

  /**
   * Install a worker loader, or remove it with null.
   *
   * Installation does not select worker execution; call
   * `UseWorkerLoading(true)` or pass `useWorkerLoading: true`.
   *
   * @param {CjsResManWorkerLoader|null} loader The worker loader.
   * @returns {BlueResMan} This resource manager.
   */
  SetWorkerLoader(loader) {
    const wasSelected = this.resourceLoader === this.workerLoader;
    if (loader === null || loader === false) {
      this.workerLoader = null;
      if (wasSelected) this.resourceLoader = this.mainThreadLoader;
      return this;
    }

    this.workerLoader = loader;
    if (wasSelected) this.resourceLoader = loader;
    return this;
  }

  /**
   * Select worker-backed execution, lazily creating the default module worker
   * loader when required. Unsupported sources and formats still use the
   * configured main-thread loader.
   *
   * @param {boolean} [value=true] Whether worker execution is selected.
   * @returns {BlueResMan} This resource manager.
   */
  UseWorkerLoading(value = true) {
    if (!value) {
      this.resourceLoader = this.mainThreadLoader;
      return this;
    }
    if (!this.workerLoader) this.SetWorkerLoader(new CjsResManWorkerLoader({ fallback: this.mainThreadLoader }));
    this.workerLoader.Reset();
    this.resourceLoader = this.workerLoader;
    return this;
  }

  /**
   * Report whether worker-backed execution is the selected strategy.
   *
   * @returns {boolean}
   */
  IsWorkerLoading() {
    return Boolean(this.workerLoader && this.resourceLoader === this.workerLoader);
  }

  /**
   * Return unresolved requests owned by the selected/installed worker loader.
   *
   * @returns {number}
   */
  GetPendingWorkers() {
    return this.workerLoader?.GetPendingCount() ?? 0;
  }

  /**
   * `AddToQueue` (BlueResMan.cpp:332-344) - queues a callback on one of the
   * manager's queues. The callback is called with the context, as Carbon's
   * `void (*)( void* pContext )` (IBlueCallbackMan.h:12); an async callback
   * returns its promise to the callback manager, which holds the slot until it
   * settles. Carbon writes the id through its output pointer; it is the return
   * value here (ruled 2026-10-17).
   *
   * @adapted Carbon's background threads wake on their semaphore; here a
   *   background entry schedules a pump (`ScheduleBackgroundQueue`). A main
   *   entry waits for `Update`, as Carbon's does.
   * @param {number} queue `BlueResManQueue`.
   * @param {Function} callback Called with the context.
   * @param {*} [context=null] The callback's argument.
   * @param {number} [flags=IBlueCallbackMan.BCBF_NONE] `IBlueCallbackMan` flags.
   * @returns {number} The entry's id.
   */
  AddToQueue(queue, callback, context = null, flags = IBlueCallbackMan.BCBF_NONE) {
    const id = { value: 0 };
    this._threadQueues[queue].Add(callback, context, flags, id);

    if (queue === BlueResManQueue.BRMQ_BACKGROUND) this.ScheduleBackgroundQueue();
    return id.value;
  }

  /**
   * `CancelFromQueue( q, id )` (BlueResMan.cpp:346-357): cancels one entry of
   * a queue through its callback manager's `Cancel`. Carbon skips a queue
   * that was never created; both of ours exist from construction.
   *
   * @implemented
   * @param {number} queue `BlueResManQueue`.
   * @param {number} id The entry's id, as `AddToQueue` returned it.
   * @returns {void}
   */
  CancelFromQueue(queue, id) {
    this._threadQueues[queue].Cancel(id);
  }

  /**
   * `GetNextIdForQueue( q )` (BlueResMan.cpp:359-372): the id the queue's
   * next entry will get, from its callback manager's `GetNextId`. Carbon
   * returns 0 for a queue that was never created; both of ours exist from
   * construction.
   *
   * @implemented
   * @param {number} queue `BlueResManQueue`.
   * @returns {number} The next entry's id.
   */
  GetNextIdForQueue(queue) {
    return this._threadQueues[queue].GetNextId();
  }

  /**
   * `PumpMainThreadQueue` (BlueResMan.cpp:374-379) - one `Update` of the main
   * queue.
   *
   * @implemented
   * @returns {boolean} Whether an entry was started.
   */
  PumpMainThreadQueue() {
    return this._threadQueues[BlueResManQueue.BRMQ_MAIN].Update();
  }

  /**
   * Starts background entries while the queue has free slots.
   *
   * Ours: Carbon's background queue runs its own threads, which take entries
   * themselves; ours runs in `Update` mode (see `_threadQueues`), so this
   * fills its slots.
   *
   * @returns {boolean} Whether an entry was started.
   */
  PumpBackgroundQueue() {
    const background = this._threadQueues[BlueResManQueue.BRMQ_BACKGROUND];
    let started = false;
    while (background.Update()) started = true;
    return started;
  }

  /**
   * `PauseQueue` (BlueResMan.cpp:381-389) - forwards to the queue's `Pause`.
   *
   * @implemented
   */
  PauseQueue(queue) {
    this._threadQueues[queue].Pause();
  }

  /**
   * `ResumeQueue` (BlueResMan.cpp:391-399) - forwards to the queue's `Resume`.
   * A resumed background queue refills through its slot-free callback; the main
   * queue runs at the next `Update`.
   *
   * @implemented
   */
  ResumeQueue(queue) {
    this._threadQueues[queue].Resume();
  }

  /**
   * `GetPendingLoads` (BlueResMan.cpp:505-508) - the background queue's entries, waiting or running.
   *
   * @implemented
   */
  GetPendingLoads() {
    return this._threadQueues[BlueResManQueue.BRMQ_BACKGROUND].GetSize();
  }

  /**
   * `GetPendingPrepares` (BlueResMan.cpp:510-513) - the main queue's entries, waiting or running.
   *
   * @implemented
   */
  GetPendingPrepares() {
    return this._threadQueues[BlueResManQueue.BRMQ_MAIN].GetSize();
  }

  /**
   * The statistics tail of `BlueResMan::Update` (BlueResMan.cpp:466-500): copies
   * one prepare loop's count and time and both queues' sizes and waiting times
   * into Carbon's members. Our `Update` runs it straight after its prepare
   * loop, before the cache and purge housekeeping Carbon's has no part of.
   *
   * @param {{processed: number, elapsed: number}} prepareResult The prepare loop's count and milliseconds.
   */
  _UpdateStatistics(prepareResult) {
    const main = this._threadQueues[BlueResManQueue.BRMQ_MAIN];
    const background = this._threadQueues[BlueResManQueue.BRMQ_BACKGROUND];
    const timeInUpdate = prepareResult.elapsed / 1000;
    this.preparesHandledLastTick = prepareResult.processed;
    this.preparesHandledTotal += this.preparesHandledLastTick;
    if (this.preparesHandledLastTick > this.preparesHandledPerTickMax) this.preparesHandledPerTickMax = this.preparesHandledLastTick;
    if (timeInUpdate > this.mainThreadMaxTime) this.mainThreadMaxTime = timeInUpdate;

    this.pendingPrepares = main.GetSize();
    this.pendingLoads = background.GetSize();

    this.prepareQueueTimeMax = main.GetTimeInQueueMax();
    this.prepareQueueTimeAverage = main.GetTimeInQueueAverage();

    this.loadQueueTimeMax = background.GetTimeInQueueMax();
    this.loadQueueTimeAverage = background.GetTimeInQueueAverage();
  }

  /**
   * `SetLoadingThreadCount` (BlueResMan.cpp:520-528) - how many loads the
   * background queue runs at once, at least one.
   *
   * @adapted Carbon stops the queue's threads, sets the count and runs them
   *   again. Our background queue is not threaded; its slots are async, so the
   *   count applies to the next loads without a stop, and the queue is pumped
   *   in case the count rose.
   * @param {number} n The count; below 1 becomes 1.
   */
  SetLoadingThreadCount(n) {
    if (n < 1) n = 1;
    this.maxConcurrentLoads = n;
    this._threadQueues[BlueResManQueue.BRMQ_BACKGROUND].SetThreadCount(n);
    this.ScheduleBackgroundQueue();
  }

  /**
   * One queue's counts and waiting times, for diagnostics panels.
   *
   * Ours: Carbon exposes the same figures as members filled by `Update`
   * (BlueResMan_Blue.cpp:154-230); this reads them from the queue now, plus
   * the running count (`BlueCallbackMan.GetActiveCount`).
   *
   * @param {number} queue `BlueResManQueue`.
   * @returns {{pending: number, active: number, queued: number, paused: boolean, averageWait: number, maxWait: number}}
   *   Entries waiting or running, running, waiting, whether paused, and the waits in seconds.
   */
  GetQueueStats(queue) {
    const manager = this._threadQueues[queue];
    const pending = manager.GetSize();
    const active = manager.GetActiveCount();
    return {
      pending,
      active,
      queued: pending - active,
      paused: manager.IsPaused(),
      averageWait: manager.GetTimeInQueueAverage(),
      maxWait: manager.GetTimeInQueueMax()
    };
  }

  /**
   * Switches resource loading between normal and urgent concurrency policy for
   * the resource manager.
   *
   * @adapted
   */
  SetUrgentResourceLoads(value) {
    this.urgentResourceLoads = Boolean(value);
    return this;
  }

  /**
   * Reports whether urgent resource-load scheduling is active for the resource
   * manager.
   *
   * @adapted
   */
  IsUrgentResourceLoads() {
    return this.urgentResourceLoads;
  }

  /**
   * `IsOnMainThread` (BlueResMan.cpp:327) - whether the caller is on the thread
   * that ticks the main queue.
   *
   * @adapted Carbon compares thread ids. Here the manager lives only on the
   *   page's main thread and workers hold no manager, so any caller is on it.
   * @returns {boolean} True.
   */
  IsOnMainThread() {
    return true;
  }

  /**
   * `SaveObject` (BlueResMan.cpp:885-889) - writes an object to a black or
   * red file, through `SaveObjectW`.
   *
   * @implemented
   * @param {object} object The object.
   * @param {string} path File path.
   * @returns {boolean} As `SaveObjectW`.
   * @throws {Error} Always, from `SaveObjectW`.
   */
  SaveObject(object, path) {
    // Carbon (BlueResMan.cpp:885-889): widens the name and calls SaveObjectW; a JS string is both.
    return this.SaveObjectW(object, path);
  }

  /**
   * `SaveObjectW` (BlueResMan.cpp:891-930) - writes an object to a black or
   * red file.
   *
   * Not implemented: writing goes through a host file system, and nothing
   * here saves objects yet.
   *
   * @notImplemented
   * @param {object} _object The object.
   * @param {string} _path File path.
   * @returns {never}
   * @throws {Error} Always.
   */
  SaveObjectW(_object, _path) {
    throw new Error("BlueResMan.SaveObjectW is not implemented.");
  }

  /**
   * `ReserveBackgroundLoadMemory` (BlueResMan.cpp:401-418).
   *
   * Deliberate no-op: Carbon reserves a file's size before loading it; in the
   * browser that size is unknown or wrong (compressed transfers, decoded and
   * converted results), so loads are limited by counts and time instead.
   *
   * Carbon's 256 MB budget (BlueResMan.cpp:75,401-418) is not a browser limit.
   */
  ReserveBackgroundLoadMemory(_size)
  {
  }

  /**
   * `ReleaseBackgroundLoadMemory` (BlueResMan.cpp:420-432).
   *
   * Deliberate no-op paired with `ReserveBackgroundLoadMemory`; browser queue
   * concurrency and scheduling remain independent of Carbon's byte budget.
   */
  ReleaseBackgroundLoadMemory(_size)
  {
  }

  /**
   * Reports whether any resource load or preparation remains pending for the
   * resource manager.
   */
  IsLoading() {
    return this.GetPendingLoads() + this.GetPendingPrepares() + this.GetPendingWorkers() > 0;
  }

  /**
   * Pump background and main-thread work, enforce the recorded-byte cache
   * budget, then run a due automatic inactivity sweep when one has been
   * explicitly configured. Queue work is processed before housekeeping, and
   * manager-owned active loads/prepares hold eviction locks. No housekeeping
   * operation fetches, prepares, or reloads source data.
   *
   * @adapted
   * @param {CjsResManUpdateOptions} [options={}] Queue budgets and optional automatic-purge controls.
   * @returns {boolean} Whether queue work ran or housekeeping released owned state.
   * @throws {TypeError} If queue, cache, purge timing, or MotherLode policy options are invalid.
   * @throws {AggregateError} If cache or inactivity housekeeping cannot clean one or more resources.
   */
  Update(options = {}) {
    // One clock read per tick: every plain KeepAlive() until the next update
    // renews with this time (BlueAsyncRes.KeepAlive).
    this.activityTime = this.motherLode.GetActivityTime();
    const loaded = this.PumpBackgroundQueue();
    const prepareResult = this._RunMainThreadQueue(options.prepare || options);
    const prepared = prepareResult.processed > 0;
    this._UpdateStatistics(prepareResult);
    const cacheOptions = options.cache === true || options.cache === undefined
      ? {}
      : options.cache;
    const cacheResult = options.cache === false
      ? null
      : this.motherLode.TrimCache(cacheOptions);
    const objectCacheResult = options.cache === false
      ? null
      : this.loadObjectCache.TrimCache(cacheOptions);
    const trimmed = Boolean((cacheResult && cacheResult.evicted > 0)
      || (objectCacheResult && objectCacheResult.evicted > 0));
    const purgeOptions = options.purge === true || options.purge === undefined
      ? {}
      : options.purge;
    const purgeResult = options.purge === false
      ? null
      : this.PumpAutoPurge(purgeOptions);
    const purged = Boolean(purgeResult
      && (purgeResult.purged > 0 || purgeResult.payloadsReleased > 0));
    const watched = this.UpdateWatched(options.watch || {}) > 0;
    return loaded || prepared || trimmed || purged || watched;
  }

  /**
   * Compatibility alias for {@link BlueResMan#Update}. It uses the same queue
   * budgets, byte-cache housekeeping, opt-in purge cadence, return value, and
   * error behavior.
   *
   * @param {CjsResManUpdateOptions} [options={}] Queue budgets and optional automatic-purge controls.
   * @returns {boolean} Whether queue work ran or housekeeping released owned state.
   * @throws {TypeError|AggregateError} If update options or a due purge fail.
   */
  Tick(options = {}) {
    return this.Update(options);
  }

  /**
   * The per-frame tick from `blue.os`, as Carbon's is: `BlueResMan::OnTick`
   * is `Update()` (BlueResMan.cpp:434-437), and the manager registers for it
   * (`BeOS->RegisterForTicks`, BlueResMan.cpp:113). MotherLode's trimming runs
   * inside `Update`, so it ticks through the manager rather than registering
   * separately as Carbon's MotherLode does.
   *
   * @implemented
   * @param {number} _realTime Real time.
   * @param {number} _simTime Simulation time.
   * @param {*} _cookie Registration cookie.
   */
  OnTick(_realTime, _simTime, _cookie) {
    this.Update();
  }

  /**
   * `Wait` (BlueResMan.cpp:935-982) - returns once both queues are empty:
   * `GetPendingLoads() + GetPendingPrepares()` is zero. Without Stackless,
   * Carbon runs `Update()` until then (`:971-977`), so it also waits for work
   * queued after the call, such as the textures a ship requests while it
   * loads. A failed or cancelled entry has left its queue, so it counts as
   * done.
   *
   * @adapted Carbon blocks; here each pass pumps both queues as `Update` does
   *   (its statistics included) and then yields, since a load's slot frees only
   *   when its fetch settles. Paused queues stay paused, and `Wait` waits for
   *   them. With `pump: false` it only checks the count between yields, leaving
   *   the pumping to whoever ticks the manager.
   * @param {CjsResManWaitOptions} [options={}] Pumping and cooperative-yield controls.
   * @returns {Promise<BlueResMan>} This manager, once both queues are empty.
   * @throws {TypeError} If options, `pump`, or `yield` are invalid.
   * @throws {Error} If a queue pump or custom yield callback itself fails.
   */
  async Wait(options = {})
  {
    if (!options || typeof options !== "object" || Array.isArray(options))
    {
      throw new TypeError("BlueResMan.Wait options must be an object.");
    }
    if (options.pump !== undefined && typeof options.pump !== "boolean")
    {
      throw new TypeError("BlueResMan.Wait pump must be a boolean when supplied.");
    }
    if (options.yield !== undefined && typeof options.yield !== "function")
    {
      throw new TypeError("BlueResMan.Wait yield must be a function when supplied.");
    }

    const yieldQueue = options.yield || defaultQueueYield;
    while (this.GetPendingLoads() + this.GetPendingPrepares() > 0)
    {
      if (options.pump !== false)
      {
        this.PumpBackgroundQueue();
        this._UpdateStatistics(this._RunMainThreadQueue());
        if (this.GetPendingLoads() + this.GetPendingPrepares() === 0) break;
      }
      await yieldQueue();
    }
    return this;
  }

  /**
   * `WaitUrgent` (BlueResMan.cpp:984-1000): settles once the urgent loads and
   * reloads pending at the call have finished.
   *
   * @adapted Carbon sends a marker flagged `BCBF_FENCE | BCBF_URGENT` through the
   *   background queue and then the main queue. That works because Carbon queues a
   *   resource's prepare as one main-queue entry before its load entry finishes
   *   (BlueAsyncRes.cpp:108-120). Ours queues the prepare in stages after the load
   *   settles, so a marker could pass between them; the urgent operations pending
   *   at the call are awaited instead.
   * @returns {Promise<BlueResMan>} This manager, once those operations have settled.
   */
  async WaitUrgent()
  {
    await Promise.allSettled([ ...this._urgentOperations ]);
    return this;
  }

  /** Keeps an urgent load or reload for `WaitUrgent` while it is pending. */
  _TrackUrgentOperation(operation)
  {
    this._urgentOperations.add(operation);
    const forget = () => this._urgentOperations.delete(operation);
    operation.then(forget, forget);
  }

  /**
   * Schedules a background pump on a microtask, when entries are waiting and
   * the queue is not paused.
   *
   * Ours: the stand-in for Carbon's background threads waking on their
   * semaphore (see `_threadQueues`).
   */
  ScheduleBackgroundQueue() {
    const background = this._threadQueues[BlueResManQueue.BRMQ_BACKGROUND];
    if (this._backgroundPumpScheduled || background.IsPaused() || background.GetSize() === background.GetActiveCount()) return this;
    this._backgroundPumpScheduled = true;
    Promise.resolve().then(() => {
      this._backgroundPumpScheduled = false;
      this.PumpBackgroundQueue();
    });
    return this;
  }


  /**
   * Register the direct byte-to-object reader for one input extension.
   * Direct loaders take precedence over registered format facades and are
   * resolved from current setup-time configuration whenever source is read.
   * A direct loader represents only the extension's unforced default result;
   * multiple named outputs belong on a registered format facade.
   *
   * @param {string} ext Input extension with or without a leading dot.
   * @param {Function} loader Reader receiving source bytes and an immutable preparation context.
   * @returns {BlueResMan} This resource manager.
   * @throws {TypeError} If the extension or loader is invalid.
   */
  RegisterObjectLoader(ext, loader) {
    const key = normalizeResourceExtension(ext);
    if (!key) throw new TypeError("BlueResMan.RegisterObjectLoader requires an extension.");
    if (typeof loader !== "function") throw new TypeError("BlueResMan.RegisterObjectLoader requires a loader function.");
    this.objectLoaders.set(key, loader);
    return this;
  }

  /**
   * Registers how an extension's files become objects the way Carbon's
   * LoadObject does (BlueResMan.cpp:653, cache :722-773): `CreateBuilder(bytes,
   * context)` returns an IBlueObjectBuilder - anything with
   * `CreateObject(objectMarker)` - which the manager keeps as the payload.
   * Every LoadObject then builds a new object from it, so the parse is shared
   * and no two callers share an object.
   *
   * @param {string} ext Input extension with or without a leading dot.
   * @param {Function} CreateBuilder Reader receiving source bytes and the preparation context.
   * @returns {BlueResMan} This resource manager.
   * @throws {TypeError} If the extension or factory is invalid.
   */
  RegisterObjectBuilder(ext, CreateBuilder) {
    this.RegisterObjectLoader(ext, CreateBuilder);
    this._objectBuilderLoaders.add(CreateBuilder);
    return this;
  }

  /**
   * Register a reusable format facade for each accepted input extension.
   * Multiple candidates may share an extension and are resolved by requested
   * output/media type or by their support probes. Defaults are deep-copied into
   * a detached plain-object/array snapshot so later caller mutation cannot
   * rewrite the registered configuration. Format methods are read from the
   * currently registered facade when an operation runs.
   *
   * @param {Function} Format Format facade declaring at least one extension.
   * @param {object} [defaults={}] Plain reader-option defaults to snapshot for this registration.
   * @returns {BlueResMan} This resource manager.
   * @throws {TypeError} If the format declaration or immutable defaults snapshot is invalid.
   */
  RegisterFormat(Format, defaults = {})
  {
    if (typeof Format !== "function")
    {
      throw new TypeError("BlueResMan.RegisterFormat requires a format class.");
    }
    if (!Array.isArray(Format.extensions) || Format.extensions.length === 0)
    {
      throw new TypeError(`${Format.name || "Format"} must declare non-empty extensions.`);
    }

    const descriptor = createFormatDescriptor(Format, defaults);
    for (const inputType of Format.extensions)
    {
      const key = normalizeResourceExtension(inputType);
      if (!key) continue;
      const candidates = this.formats.get(key) || [];
      const next = candidates.filter(candidate => candidate.Format !== Format);
      next.push(descriptor);
      this.formats.set(key, next);
    }
    return this;
  }

  /**
   * Register one extension-selected resource or object handler and its reader
   * route. A format constructor and an ordered format array are short forms
   * for `{ Format }` and `{ Formats }` respectively.
   *
   * Re-registration replaces the complete route for future uncached handles.
   * Existing handles retain the route snapshot captured at construction.
   *
   * @cjs
   * @implemented
   * @param {string} extension Input extension with or without a leading dot.
   * @param {Function} Handler IBlueResource-compatible handler constructor.
   * @param {Function|Function[]|object} [formatOrFormatsOrOptions={}] Reader and optional target configuration.
   * @returns {BlueResMan} This resource manager.
   * @throws {TypeError} If the extension, handler, formats, or target policy is invalid.
   */
  RegisterExtension(extension, Handler, formatOrFormatsOrOptions = {})
  {
    const ext = normalizeResourceExtension(extension);
    if (!ext)
    {
      throw new TypeError("BlueResMan.RegisterExtension requires an extension.");
    }
    const handlerMode = Handler.handlerMode ?? (Handler.isResource === true ? ResourceHandlerMode.RESOURCE : null);
    if (!Object.values(ResourceHandlerMode).includes(handlerMode))
    {
      throw new TypeError(
        "BlueResMan.RegisterExtension Handler.handlerMode must be ResourceHandlerMode.RESOURCE or ResourceHandlerMode.OBJECT."
      );
    }

    const options = normalizeExtensionRouteOptions(formatOrFormatsOrOptions);
    const instance = options.instance || null;
    if (instance && (typeof instance !== "object" || Array.isArray(instance)))
      throw new TypeError("Resource format registration requires a configured format instance.");
    if (instance)
    {
      // Registered reader policy is fixed; a new profile has a new cache identity.
      Object.freeze(instance.options);
      Object.freeze(instance._classes);
      Object.freeze(instance);
    }
    const hasFormat = options.Format !== undefined || options.format !== undefined;
    const hasFormats = options.Formats !== undefined || options.formats !== undefined;
    if (instance && (hasFormat || hasFormats))
      throw new TypeError("Resource format registration cannot mix an instance and class descriptors.");
    if (hasFormat && hasFormats)
    {
      throw new TypeError("BlueResMan.RegisterExtension accepts either Format or Formats, not both.");
    }

    const Target = options.Target || options.target || null;
    const Identify = options.Identify || options.identify || null;
    if (Target && Identify)
    {
      throw new TypeError("BlueResMan.RegisterExtension accepts either Target or Identify, not both.");
    }
    if ((Target || Identify) && handlerMode !== ResourceHandlerMode.OBJECT)
    {
      throw new TypeError("BlueResMan extension Target and Identify are valid only for object handlers.");
    }
    // An object route builds a Target or an Identify class; without one its
    // values are plain data, which is neither a resource nor an object.
    if (!Target && !Identify && handlerMode === ResourceHandlerMode.OBJECT)
    {
      throw new TypeError(`BlueResMan extension .${ext}: an object handler needs a Target or Identify; register a Res class for a resource.`);
    }
    if (Target) assertExtensionTarget(Target, "Target");
    if (Identify && typeof Identify !== "function")
    {
      throw new TypeError("BlueResMan extension Identify must be a function.");
    }

    const explicitFormats = hasFormat
      ? [ options.Format || options.format ]
      : hasFormats
        ? options.Formats || options.formats
        : null;
    if (explicitFormats !== null && !Array.isArray(explicitFormats))
    {
      throw new TypeError("BlueResMan extension Formats must be an array.");
    }

    const loader = !instance && explicitFormats === null ? this.GetObjectLoader(ext) : null;
    const formats = instance ? [] : explicitFormats === null
      ? loader ? [] : this.GetFormatDescriptors(ext)
      : explicitFormats.map((entry, index) => createExtensionFormatDescriptor(
        entry,
        options.defaults || {},
        `Formats[${index}]`
      ));
    if (!instance && !loader && formats.length === 0)
    {
      throw new TypeError(`BlueResMan extension .${ext} requires a Format, Formats, or registered reader.`);
    }
    validateOrderedExtensionFormats(formats, ext);

    const route = {
      extension: ext,
      Handler,
      handlerMode,
      loader,
      formats: [ ...formats ],
      instance,
      Target,
      Identify
    };
    this._extensionRoutes.set(ext, route);
    return this;
  }

  /**
   * Return the current immutable explicit route for one extension.
   *
   * @param {string} extension Input extension with or without a leading dot.
   * @returns {object|null} Captured route descriptor, or `null`.
   */
  GetExtensionRoute(extension)
  {
    return this._extensionRoutes.get(normalizeResourceExtension(extension)) || null;
  }

  /**
   * Registers the constructor that builds `dynamic:/<name>/<query>` resources
   * (BlueResMan.cpp:296-305). The name is lowercased, as Carbon's is; the
   * constructor's `GetResource(query)` returns a resource for that query.
   *
   * @adapted
   * @param {string} name Name following `dynamic:/`.
   * @param {IBlueDynamicResourceConstructor} constructor Resource constructor.
   * @returns {BlueResMan} This resource manager.
   * @throws {TypeError} If the name is empty.
   */
  RegisterResourceConstructor(name, constructor)
  {
    const key = String(name ?? "").toLowerCase();
    if (!key)
    {
      throw new TypeError("BlueResMan.RegisterResourceConstructor requires a name.");
    }
    this._dynamicConstructors.set(key, constructor);
    return this;
  }

  /**
   * Removes a dynamic resource constructor (BlueResMan.cpp:312-325).
   *
   * @adapted
   * @param {string} name Name following `dynamic:/`.
   * @returns {BlueResMan} This resource manager.
   */
  UnregisterResourceConstructor(name)
  {
    this._dynamicConstructors.delete(String(name ?? "").toLowerCase());
    return this;
  }

  /**
   * Return registered format facades for one normalized input extension.
   *
   * @param {string} inputType Input extension with or without a leading dot.
   * @returns {Function[]} Detached format-class list in registration order.
   */
  GetFormats(inputType)
  {
    return this.GetFormatDescriptors(inputType).map(descriptor => descriptor.Format);
  }

  /**
   * Select one registered format facade for an input and requested outcome.
   *
   * @param {string} inputType Input extension with or without a leading dot.
   * @param {object} [options={}] Optional format, output, media type, and source-byte selectors.
   * @returns {Function} Unambiguous selected format facade.
   * @throws {Error} If no candidate matches or multiple candidates remain.
   */
  ResolveFormat(inputType, options = {})
  {
    return this.ResolveFormatDescriptor(inputType, options).Format;
  }

  /**
   * Return the cached resource selected by source path and Carbon's ex suffix.
   * A new handle is initialized before insertion. Cache hits renew its activity;
   * reload: true explicitly restarts that same handle, releasing its consumers'
   * derived data before loading. Await Ready(resource) for completion. Failure
   * remains prepared but not good until another explicit reload.
   *
   * @adapted JavaScript constructors represent interface identities; the result is
   *   the resource or null rather than a boolean and an output pointer.
   *   Only a Res class registered for the extension (plus `ex`) is served; for
   *   anything else - an object file, plain data - it logs "No factory found for
   *   extension" and returns null, as Carbon's does (BlueResMan.cpp:266-273).
   * @param {string} path Carbon-style source resource path.
   * @param {object} [options={}] Factory suffix, source provenance and explicit reload settings.
   * @param {string} [options.ex=""] Carbon factory suffix, appended to the source extension.
   * @param {Function} [options.iid=IBlueResource] Carbon interface identity, checked after factory selection.
   * Carbon: BlueResMan::GetResourceW/GetResourceHelper (blue/src/BlueResMan.cpp:143-290).
   * @returns {BlueAsyncRes|null} Cached or newly initialized handle, or null for an unsupported factory/interface.
   * @throws {TypeError} If the path, identity settings, or resource constructor are invalid.
   * @throws {Error} If MotherLode is inactive or displaced-resource cleanup fails.
   */
  GetResource(path, options = {}) {
    const resource = this._GetResource(path, options);
    // Carbon: BlueResMan::GetResourceW (blue/src/BlueResMan.cpp:143-163).
    // The requested interface validates the selected resource; it never selects
    // another factory or changes MotherLode identity.
    return resource ? IRoot.prototype.QueryInterface.call(resource, options.iid || IBlueResource, BEQI_SILENT) : null;
  }

  /**
   * `GetResourceW` (BlueResMan.cpp:143-160) - `GetResource` for a
   * wide-character path.
   *
   * @adapted
   * @param {string} path Carbon-style source resource path.
   * @param {object} [options={}] As `GetResource`.
   * @returns {BlueAsyncRes} As `GetResource`.
   */
  GetResourceW(path, options = {}) {
    // Carbon (BlueResMan.cpp:130-141): GetResource widens its strings and calls GetResourceW; a JS string is both.
    return this.GetResource(path, options);
  }

  /**
   * Resolve extension plus ex to its Res class, initialize, then insert as
   * Carbon does. Object loads have their own path (`_GetLoadingObject`).
   *
   * @cjs
   * @implemented
   * @param {string} path
   * @param {object} [options={}]
   * @returns {BlueAsyncRes|null}
   */
  _GetResource(path, options = {})
  {
    if (typeof path !== "string" || !path) throw new TypeError("Resource path must be non-empty.");
    const key = normalizeResourcePath(path);
    const ex = this.GetResourceVariant(options);
    const cacheKey = getMotherLodeKey(key, ex);
    const existing = this.motherLode.Lookup(cacheKey);
    if (existing)
    {
      this.motherLode.KeepAlive(cacheKey);
      if (options.reload === true)
      {
        const record = this._GetResourceRecord(existing);
        record.request = mergeResourceLoaderOptions(record.request, options);

        existing.Reload();
      }
      return existing;
    }
    if (isDynamicResourcePath(key)) return this._CreateDynamicResource(key, cacheKey);

    const ext = normalizeResourceExtension((options.ext || getResourceExtension(key)) + ex);
    const route = this.GetExtensionRoute(ext);
    const Constructor = route?.handlerMode === ResourceHandlerMode.RESOURCE ? route.Handler : null;
    if (!Constructor)
    {
      CcpLog.CCP_LOGERR_CH(CcpLog.GetModuleChannel("blue"), "No factory found for extension (%s, %s)", path, ex);
      return null;
    }
    const resource = this.CreateResource(Constructor, key, ex, options, route);
    this.motherLode.Insert(cacheKey, resource);
    this._LogResourceEvent(resource, "requested", "Requested %s", path);
    const operation = this._GetResourceLoad(resource);
    if (operation && !operation.locked)
    {
      this.LockResource(resource);
      operation.locked = true;
    }
    this.motherLode.KeepAlive(cacheKey);
    return resource;
  }


  /**
   * Resolve one object outcome for a canonical resource identity. For a
   * registered object builder this is Carbon's `BlueResMan::LoadObject`
   * (blue/src/BlueResMan.cpp:653): the parsed file is cached (`m_loadObjectCache`,
   * one IBlueObjectBuilder per file, :722-773) and every call builds a new
   * object from it (:785). Concurrent callers share only the active operation. Once settled, a resident payload
   * is returned without rereading source data and its explicit payload lease is
   * renewed. If the payload was released, calling this method explicitly starts
   * reconstruction; liveness queries and purge operations never do so.
   * `sourceRevision` selects read-cache provenance but does not replace a
   * resident payload by itself—use one-shot `reload: true` to reload the same handle.
   *
   * This is Carbon's `const char*` overload (BlueResMan.h:82); the
   * `const wchar_t*` one (BlueResMan.h:83) is `LoadObject__WChars`, which
   * differs only in string encoding, which JavaScript strings do not have.
   *
   * @adapted
   * @adapted Carbon's LoadObject yields its Stackless tasklet while it reads and builds
   * (`GetFileContentsWithYield`, `CreateObjectWithYield`, BlueResMan.cpp:753,785), so its caller
   * sees a plain return while the program keeps running. A browser cannot block on a read, and
   * `await` suspends only the function it is written in, so this returns a promise and every
   * caller that wants the object awaits it in turn; a caller cannot be made synchronous.
   *
   * @param {string} path Carbon-style source resource path.
   * @param {object} [options={}] Identity, source, format, loader, and queue options.
   * @returns {Promise<*>} In-flight, resident, or reconstructed object outcome.
   * @throws {TypeError|Error} If path, identity, source, format, or conversion configuration is invalid.
   */
  LoadObject(path, options = {})
  {
    return this._LoadObject(path, options, true);
  }

  /**
   * `LoadObject( const wchar_t* name, ... )` (BlueResMan.cpp:653) -
   * `LoadObject` for a wide-character path.
   *
   * @adapted
   * @param {string} path Carbon-style source resource path.
   * @param {object} [options={}] As `LoadObject`.
   * @returns {Promise<*>} As `LoadObject`.
   */
  LoadObject__WChars(path, options = {})
  {
    // Carbon (BlueResMan.cpp:547-551): the const char* overload widens and calls this one; a JS string is both.
    return this.LoadObject(path, options);
  }

  /**
   * Load shared source data, then build a fresh object for this caller only.
   *
   * @cjs
   * @implemented
   * @param {string} path Carbon-style resource path.
   * @param {object} options Source and reader options.
   * @param {boolean} build Whether to construct a fresh graph for this caller.
   * @returns {Promise<*>} Fresh graph or the load result.
   */
  async _LoadObject(path, options, build)
  {
    const resource = this._GetLoadingObject(path, options);
    const result = await this.Ready(resource);
    if (!build) return result;
    if (this._IsObjectBuilderResource(resource)) return this._QueueObjectBuild(resource);
    return this._ObjectOutcome(resource, path);
  }

  /**
   * LoadObject's lookup in `loadObjectCache` (BlueResMan.cpp:722-773): the
   * cached loading object for path plus `ex`, or a new one for an object
   * route - a registered object builder, or an OBJECT-mode route with a Target
   * or Identify - initialized and inserted.
   *
   * Adapted: Carbon caches the parsed builder itself; ours caches the loading
   * object that reads it asynchronously and keeps the builder as its payload.
   *
   * @param {string} path Carbon-style resource path.
   * @param {object} [options={}] Identity, source, format and reload options.
   * @returns {BlueAsyncRes} The loading object.
   * @throws {TypeError} If the path is a resource or plain data, not an object.
   * @throws {Error} If no reader is registered for the extension.
   */
  _GetLoadingObject(path, options = {})
  {
    if (typeof path !== "string" || !path) throw new TypeError("Resource path must be non-empty.");
    const key = normalizeResourcePath(path);
    const ex = this.GetResourceVariant(options);
    const cacheKey = getMotherLodeKey(key, ex);
    const existing = this.loadObjectCache.Lookup(cacheKey);
    if (existing)
    {
      this.loadObjectCache.KeepAlive(cacheKey);
      if (options.reload === true)
      {
        const record = this._GetResourceRecord(existing);
        record.request = mergeResourceLoaderOptions(record.request, options);
        existing.Reload();
      }
      return existing;
    }

    if (isDynamicResourcePath(key))
    {
      throw new TypeError(`BlueResMan.LoadObject: ${path} is a resource, not an object; get it with GetResource(path).`);
    }

    const ext = normalizeResourceExtension((options.ext || getResourceExtension(key)) + ex);
    const route = this.GetExtensionRoute(ext);
    let Constructor = null;
    if (route)
    {
      if (route.handlerMode !== ResourceHandlerMode.OBJECT)
      {
        throw new TypeError(`BlueResMan.LoadObject: ${path} is a resource, not an object; get it with GetResource(path).`);
      }
      Constructor = route.Handler;
    }
    else if (!ex && this._objectBuilderLoaders.has(this.GetObjectLoader(ext)))
    {
      Constructor = CjsLoadingObject;
    }
    else if (this.GetObjectLoader(ext) || this.GetFormatDescriptors(ext).length)
    {
      this._RefusePlainObject(path);
    }
    else
    {
      throw new Error("No resource factory for " + path);
    }

    const resource = this.CreateResource(Constructor, key, ex, options, route);
    this._objectLoads.add(resource);
    this.loadObjectCache.Insert(cacheKey, resource);
    this._LogResourceEvent(resource, "requested", "Requested %s for LoadObject", path);
    const operation = this._GetResourceLoad(resource);
    if (operation && !operation.locked)
    {
      this.LockResource(resource);
      operation.locked = true;
    }
    this.loadObjectCache.KeepAlive(cacheKey);
    return resource;
  }

  /**
   * What a settled load hands one LoadObject caller: a new object built from
   * what the load kept, a builder or a route's Target. Plain values - an
   * Identify that answered `true` - are refused: LoadObject returns objects only
   * (BlueResMan.cpp:724-785).
   *
   * @param {BlueAsyncRes} resource The loading object.
   * @param {string} path The requested path, for the message.
   * @returns {*} The caller's object.
   * @throws {TypeError} When the load yielded plain values.
   */
  _ObjectOutcome(resource, path)
  {
    if (this._objectBuilders.has(resource)) return this._BuildObject(resource);
    return this._RefusePlainObject(path);
  }

  /**
   * AN OBJECT KNOWS ITS CLASS (operator ruling, 2026-09-28): LoadObject builds
   * from a registered object builder or a route that hydrates a Target or an
   * Identify class. Plain decoded values are neither a resource nor an object;
   * they are read directly (2026-11-01).
   *
   * @cjs
   * @implemented
   * @param {string} path The requested path.
   * @returns {never}
   * @throws {TypeError} Always.
   */
  _RefusePlainObject(path)
  {
    throw new TypeError(`BlueResMan.LoadObject: ${path} yields plain data, not an object; read it with ReadResource(path), ResolveFormatDescriptor and ReadFormat.`);
  }

  /**
   * Whether a resource loads through a registered object builder
   * (RegisterObjectBuilder) rather than a route or a plain loader.
   *
   * @cjs
   * @implemented
   * @param {BlueAsyncRes} resource Canonical resource.
   * @returns {boolean} True for a builder-loaded resource.
   */
  _IsObjectBuilderResource(resource)
  {
    return !this._resourceExtensionRoutes.has(resource)
      // Keep the explicit extension aligned with _GetResource and _ResolveResourceObjectRead.
      && this._objectBuilderLoaders.has(this.GetObjectLoader(this._GetResourceRequest(resource)?.ext || getResourceExtension(resource.GetPath())));
  }

  /**
   * Fetches and hydrates an object graph without retaining a resource handle for
   * the resource manager.
   */
  FetchObject(path, options = {})
  {
    return this.LoadObject(path, options);
  }

  /**
   * Reload the internal builder in place and return a fresh graph.
   *
   * @cjs
   * @implemented
   * @param {string} path Carbon-style resource path.
   * @param {object} [options={}] Extension suffix, source and read options.
   * @returns {Promise<*>} The requested graph or resource after the same-handle load settles.
   */
  ReloadObject(path, options = {})
  {
    return this.LoadObject(path, { ...options, reload: true });
  }

  /**
   * Await the same resource handle returned by GetResource.
   *
   * @cjs
   * @implemented
   * @param {string} path Carbon-style resource path.
   * @param {object} [options={}] Extension suffix, source and read options.
   * @returns {Promise<*>} The requested graph or resource after the same-handle load settles.
   */
  async FetchResource(path, options = {})
  {
    const resource = this.GetResource(path, options);
    if (!resource) throw new Error("No resource factory for " + path);
    await this.Ready(resource);
    return resource;
  }

  /**
   * Reload the existing handle in place, as BlueAsyncRes::Reload does.
   *
   * @cjs
   * @implemented
   * @param {string} path Carbon-style resource path.
   * @param {object} [options={}] Extension suffix, source and read options.
   * @returns {Promise<*>} The requested graph or resource after the same-handle load settles.
   */
  ReloadResource(path, options = {})
  {
    return this.FetchResource(path, { ...options, reload: true });
  }


  /**
   * Fetches what a path is: an object (a route or builder that yields one,
   * through FetchObject) or otherwise its resource (FetchResource), whose
   * payload holds decoded values.
   *
   * @cjs
   * @implemented
   * @param {string} path Carbon-style resource path.
   * @param {object} [options={}] Extension suffix, source and read options.
   * @returns {Promise<*>} The requested graph or resource after the same-handle load settles.
   */
  Fetch(path, options = {})
  {
    if (options.resource === true)
    {
      return this.FetchResource(path, options);
    }

    const normalizedPath = normalizeResourcePath(path);
    const variant = this.GetResourceVariant(options);
    const cacheKey = getMotherLodeKey(normalizedPath, variant);
    if (this.loadObjectCache.Lookup(cacheKey)) return this.FetchObject(path, options);
    const existing = this.motherLode.Lookup(cacheKey);
    const ext = normalizeResourceExtension(
      (options.ext || getResourceExtension(normalizedPath)) + (options.ex ?? "")
    );
    const route = existing
      ? this._resourceExtensionRoutes.get(existing) || null
      : this.GetExtensionRoute(ext);
    const buildsObjects = route
      ? route.handlerMode === ResourceHandlerMode.OBJECT
      : this._objectBuilderLoaders.has(this.GetObjectLoader(ext));
    return buildsObjects ? this.FetchObject(path, options) : this.FetchResource(path, options);
  }


  /**
   * Return the configured reader from our resource type table.
   *
   * @cjs
   * @implemented
   * @param {string} extension Source extension, with or without a leading dot.
   * @param {string} [ex=""] Carbon resource suffix.
   * @returns {object} Configured format instance.
   * @throws {Error} When no reader is registered for this extension and suffix.
   */
  GetFormat(extension, ex = "")
  {
    const key = normalizeResourceExtension(extension) + normalizeResourceExtension(ex);
    const format = this.GetExtensionRoute(key)?.instance;
    if (!format) throw new Error("BlueResMan: no registered reader for ." + key);
    return format;
  }

  /**
   * Our format-instance lookup uses the manager's sole extension/ex table.
   * Managed resources retain their captured route; direct loads use the same table.
   *
   * @cjs
   * @implemented
   * @param {BlueAsyncRes} resource Resource whose format is required.
   * @returns {CjsFormat} Configured instance.
   */
  GetResourceFormat(resource)
  {
    const request = this._GetResourceRequest(resource);
    const extension = request.ext || getResourceExtension(resource.GetFilePath());
    return this._resourceExtensionRoutes.get(resource)?.instance
      || this.GetFormat(extension, resource.GetExt());
  }

  /**
   * Decode through the configured reader and reject cancellation before returning to the family.
   *
   * @cjs
   * @implemented
   * @param {BlueAsyncRes} resource Resource whose lifecycle belongs to this manager.
   * @param {*} bytes Input accepted by the registered reader.
   * @param {object|null} [options=null] Explicit read options, or the active attempt request.
   * @returns {Promise<*>} Decoded family data after the attempt cancellation check.
   */
  async ReadResourceObjectPayload(resource, bytes, options = null)
  {
    const attempt = this._GetResourceLoad(resource);
    const request = options || this._GetResourceRequest(resource);
    const result = await this._ReadResolvedResourceObjectPayload(resource, bytes, request,
      this._ResolveResourceObjectRead(resource, bytes, request));
    this._AssertResourceLoad(resource, attempt);
    return result;
  }

  /**
   * Resolve the configured direct loader or format descriptor once so queue
   * selection and execution use the same registration snapshot.
   *
   * @param {BlueAsyncRes} resource Resource whose CPU outcome is requested.
   * @param {*} bytes Source input.
   * @param {object} options Requested output options.
   * @returns {{loader: Function|null, descriptor: object|null, route: object|null}} Resolved reader.
   */
  _ResolveResourceObjectRead(resource, bytes, options) {
    const route = this._resourceExtensionRoutes.get(resource) || null;
    // GetExt is Carbon's request suffix. The reader consumes the source file.
    const extension = normalizeResourceExtension(options.ext || getResourceExtension(resource.GetPath()));
    const explicitLoader = route?.loader || (!route && this.GetObjectLoader(extension));
    if (explicitLoader)
    {
      if (options.emit !== undefined)
      {
        throw createObjectLoaderOutputMissingError(extension, options.emit);
      }
      return { loader: explicitLoader, descriptor: null, route };
    }

    return {
      loader: null,
      descriptor: route?.instance || (route
        ? resolveOrderedExtensionFormatDescriptor(
          route.formats,
          extension,
          { ...options, bytes, filename: resource.GetPath() }
        )
        : this.ResolveFormatDescriptor(extension, { ...options, bytes, filename: resource.GetPath() })),
      route
    };
  }

  /**
   * Execute one already-resolved reader through its direct or format path.
   *
   * @param {BlueAsyncRes} resource Resource whose CPU outcome is requested.
   * @param {*} bytes Source input.
   * @param {object} options Requested output options.
   * @param {{loader: Function|null, descriptor: object|null}} resolved Reader selection.
   * @returns {Promise<*>} Reader result.
   */
  _ReadResolvedResourceObjectPayload(resource, bytes, options, resolved) {
    if (resolved.loader)
    {
      return resolved.loader(
        bytes,
        createPrepareContext(this, resource, bytes, options, "read")
      );
    }
    return this.ReadFormatOnce(resource, resolved.descriptor, bytes, options);
  }

  /**
   * Apply a fixed target or dynamic identification policy after format reading
   * and before payload publication. Worker decoding has settled by this point,
   * so constructors and Identify functions remain on the caller thread.
   *
   * @cjs
   * @implemented
   * @param {BlueAsyncRes} resource Route handler receiving the decoded value.
   * @param {*} values Decoded format result.
   * @param {object} options Request options.
   * @param {{descriptor: object|null, route: object|null}} resolved Captured reader route.
   * @returns {*} Original or hydrated object value.
   */
  _HydrateExtensionObject(resource, values, options, resolved)
  {
    this._objectBuilders.delete(resource);
    if (resolved.loader && this._objectBuilderLoaders.has(resolved.loader))
    {
      // An IBlueObjectBuilder: the builder is what is published and kept as
      // the payload. Objects are built in LoadObject, one per caller, the
      // loading caller included - the load may have been started by the
      // resource's own object loader, whose result nobody receives.
      this._objectBuilders.set(resource, { Create: createObjectFromBuilder, values });
      return values;
    }
    const route = resolved.route;
    if (!route || (!route.Target && !route.Identify)) return values;

    const Format = resolved.descriptor?.Format || null;
    const context = {
      ...createResourcePathContext(resource.GetPath(), READ_CONTEXTS.get(options), options.ext),
      Format,
      format: Format?.id || "",
      options,
      resMan: this
    };

    let Target = route.Target;
    if (route.Identify)
    {
      try
      {
        Target = route.Identify(values, context);
      }
      catch (error)
      {
        throw createExtensionTargetError(resource, "Identify threw an error.", error);
      }
      if (Target === true) return values;
      if (Target === false || Target === null || Target === undefined)
      {
        throw createExtensionTargetError(resource, "Identify did not resolve a target constructor.");
      }
      try
      {
        assertExtensionTarget(Target, "Identify result");
      }
      catch (error)
      {
        throw createExtensionTargetError(resource, "Identify returned an invalid target constructor.", error);
      }
    }

    // Carbon retains the builder and constructs only when a caller asks for an
    // object (BlueResMan.cpp:722-785). Do not allocate a discarded first graph.
    this._objectBuilders.set(resource, { Target, context, values });
    return values;
  }

  /**
   * Build one object from decoded values. Every build receives its own
   * structured copy, so no two callers share a nested array, typed array or
   * reader carrier however `from` treats its input - Carbon's objects are
   * likewise independent, each read out of the cached reader's bytes.
   *
   * @param {BlueAsyncRes} resource Resource whose values are built.
   * @param {Function} Target Resolved target constructor.
   * @param {*} values Decoded plain values.
   * @param {object} context Hydration context captured at publication.
   * @returns {*} A new hydrated object.
   */
  _HydrateTarget(resource, Target, values, context)
  {
    let copy;
    try
    {
      copy = structuredClone(values);
    }
    catch (error)
    {
      throw createExtensionTargetError(resource, "Decoded values could not be copied for a per-caller build.", error);
    }
    try
    {
      const hydrated = typeof Target.fromYAML === "function"
        ? Target.fromYAML(copy, context)
        : typeof Target.from === "function" ? Target.from(copy)
        : CjsSchema.from(CjsSchema.getClassName(Target), copy);
      if (hydrated && typeof hydrated.then === "function")
      {
        throw new TypeError("Extension target hydration must be synchronous.");
      }
      return hydrated;
    }
    catch (error)
    {
      throw createExtensionTargetError(resource, "Target hydration failed.", error);
    }
  }

  /**
   * One LoadObject build from a registered object builder, as a MAIN-queue
   * task. Carbon builds with CreateObjectWithYield (BlueResMan.cpp:785), and a
   * BlackReader serves one build at a time, a second caller waiting until the
   * first is done (the m_allowYield wait, BlackReader.cpp:233-262). Here the
   * queue is that wait: builds run FIFO (a re-entrant request queues behind
   * the rest), each whole - one construction is never split - and the prepare
   * loop stops once its time slice is spent, at least one build per pass. The
   * budget is the measured reason (ccpwgl findings 0277-0279): 80 copies
   * built at once were one 2.7 s task; drained within the budget, no slice
   * exceeded 50 ms.
   *
   * The promise is the object path's own, LoadObject's stand-in for Carbon's
   * Stackless yield (see `LoadObject`); the queue entry itself carries none.
   * It settles when the entry runs. An entry still queued when `Clear` runs
   * stays queued, as Carbon's queues have no clear; it fails when it runs.
   *
   * @param {BlueAsyncRes} resource Resource whose payload is the builder.
   * @returns {Promise<object>} This caller's new object.
   */
  _QueueObjectBuild(resource)
  {
    return new Promise((resolve, reject) =>
    {
      this.AddToQueue(BlueResManQueue.BRMQ_MAIN, builderResource =>
      {
        try
        {
          resolve(this._BuildObject(builderResource));
        }
        catch (error)
        {
          reject(error);
        }
      }, resource, urgentFlags(resource));
    });
  }

  /**
   * Builds a new object from the resource payload through its registered factory
   * or target hydrator.
   *
   * @cjs
   * @implemented
   * @param {BlueAsyncRes} resource Resource whose lifecycle belongs to this manager.
   * @returns {object} New object graph owned by this caller.
   */
  _BuildObject(resource)
  {
    const builder = this._objectBuilders.get(resource);
    if (builder.Create) return builder.Create(this.GetResourcePayload(resource));
    return this._HydrateTarget(resource, builder.Target, this.GetResourcePayload(resource), builder.context);
  }

  /**
   * `dynamic:` branch of BlueResMan::GetResourceHelper (BlueResMan.cpp:219-245).
   * Carbon inserts every dynamic resource `CACHING_NOT_ALLOWED`; here the
   * constructor decides (`IBlueDynamicResourceConstructor.IsCacheable`), because
   * rebuilding costs a network fetch and a decode rather than a disk read.
   *
   * @adapted
   * @param {string} key Normalized `dynamic:/<name>/<query>` path.
   * @param {string} cacheKey MotherLode key.
   * @returns {BlueAsyncRes} Canonical dynamic resource.
   * @throws {Error} If no constructor is registered or it yields no resource.
   */
  _CreateDynamicResource(key, cacheKey)
  {
    const rest = key.slice(DYNAMIC_PREFIX_LENGTH);
    const slash = rest.indexOf("/");
    const name = slash === -1 ? rest : rest.slice(0, slash);
    const query = slash === -1 ? "" : rest.slice(slash + 1);
    const constructor = this._dynamicConstructors.get(name);
    if (!constructor)
    {
      throw dynamicResourceError(key, name, "CJS_RESMAN_DYNAMIC_CONSTRUCTOR_MISSING",
        `no dynamic constructor is registered for "${name}"`);
    }
    const resource = constructor.GetResource(query);
    if (!CjsSchema.cast(resource, IBlueResource))
    {
      throw dynamicResourceError(key, name, "CJS_RESMAN_DYNAMIC_RESOURCE_UNAVAILABLE",
        `dynamic constructor "${name}" returned no IBlueResource-compatible resource`);
    }
    this._dynamicResources.add(resource);

    const insertion = this.motherLode.Insert(cacheKey, resource, { replace: true, cacheable: constructor.IsCacheable() });
    const canonical = insertion?.resource || resource;
    const operation = this._GetResourceLoad(canonical);
    if (operation && !operation.locked)
    {
      this.LockResource(canonical);
      operation.locked = true;
    }

    this.motherLode.KeepAlive(cacheKey);
    return canonical;
  }


  /**
   * Warms a resource and its discovered dependencies without returning payload
   * data for the resource manager.
   */
  async Prefetch(paths, options = {}) {
    const entries = Array.isArray(paths) ? paths : [paths];
    return Promise.all(entries.map(path => this.LoadObject(path, options)));
  }

  /**
   * Return the currently registered direct reader for an input extension.
   *
   * @param {string} ext Input extension with or without a leading dot.
   * @returns {Function|null} Registered loader or `null`.
   */
  GetObjectLoader(ext) {
    return this.objectLoaders.get(normalizeResourceExtension(ext)) || null;
  }

  /**
   * Return detached references to the current format descriptors for one input
   * extension. Each descriptor contains its facade and snapshotted defaults.
   *
   * @param {string} inputType Input extension with or without a leading dot.
   * @returns {object[]} Descriptor list in registration order.
   */
  GetFormatDescriptors(inputType)
  {
    return [ ...(this.formats.get(normalizeResourceExtension(inputType)) || []) ];
  }

  /**
   * Resolve one current format registration descriptor. Output/stream filters
   * run first; optional source bytes may then run support probes to disambiguate.
   *
   * @param {string} inputType Input extension with or without a leading dot.
   * @param {object} [options={}] Format, output, stream flags, and optional byte selectors.
   * @returns {object} Selected immutable registration descriptor.
   * @throws {Error} If no candidate matches or multiple candidates remain.
   */
  ResolveFormatDescriptor(inputType, options = {})
  {
    const key = normalizeResourceExtension(inputType);
    const descriptors = this.GetFormatDescriptors(key);
    const candidates = filterFormatDescriptors(descriptors, options);
    if (descriptors.length > 0 && candidates.length === 0 && options.emit !== undefined)
    {
      throw createFormatOutputMissingError(key, options.emit, descriptors);
    }
    return resolveFormatDescriptorCandidates(candidates, key, options);
  }

  /**
   * Invoke one format descriptor using its snapshotted registration defaults and
   * the request's explicit format options. Static async/sync readers take
   * precedence over instance `ReadAsync`/`Read` compatibility methods.
   *
   * @param {object} descriptor Selected immutable registration descriptor.
   * @param {*} bytes Source bytes supplied to the format facade.
   * @param {object} [options={}] Output, class, and `formatOptions` overrides.
   * @param {object|null} [formatOptions=null] Effective options already captured by ReadFormatOnce.
   * @returns {Promise<*>} Parsed format outcome.
   * @throws {TypeError|Error} If the facade lacks a reader or reading fails.
   * @remarks Resource-backed calls pass normalized path context as the
   * reader's third argument; direct descriptor reads without a resource pass
   * `null`.
   */
  async ReadFormat(descriptor, bytes, options = {}, formatOptions = null)
  {
    const readContext = READ_CONTEXTS.get(options);
    const context = readContext
      ? createResourcePathContext(readContext.path, readContext)
      : null;
    return this.resourceLoader.ReadFormat(
      descriptor,
      bytes,
      formatOptions || createFormatReadOptions(descriptor, options),
      context
    );
  }

  /**
   * Look up a path/ex without changing its native state.
   *
   * @cjs
   * @implemented
   * @param {string} path Carbon-style resource path.
   * @param {object} [options={}] Native ex suffix selecting the cached handle.
   * @returns {BlueAsyncRes|null} Cached handle without starting a read.
   */
  Lookup(path, options = {})
  {
    return this.motherLode.Lookup(getMotherLodeKey(normalizeResourcePath(path), this.GetResourceVariant(options)));
  }

  /**
   * Forget the path/ex identity and cancel its pending work through cleanup.
   *
   * @cjs
   * @implemented
   * @param {string} path Carbon-style resource path.
   * @param {object|null} [options=null] An ex suffix, or null to remove every suffix.
   * @returns {*} MotherLode deletion result.
   */
  Delete(path, options = null)
  {
    const normalizedPath = normalizeResourcePath(path);
    return options === null
      ? this.motherLode.DeleteAllVariants(normalizedPath)
      : this.motherLode.Delete(getMotherLodeKey(normalizedPath, this.GetResourceVariant(options)));
  }

  /**
   * Run one explicit deterministic identity/payload inactivity sweep.
   * This delegates policy and cleanup to MotherLode; it never fetches or
   * reloads a purged resource.
   *
   * @param {object} [options={}] MotherLode frame/time limits and cleanup policy.
   * @returns {object} Immutable purge counts and affected canonical keys.
   * @throws {TypeError} If the configured MotherLode lacks purge support or policy is invalid.
   * @throws {AggregateError} If one or more candidate resources fail cleanup.
   */
  PurgeInactive(options = {})
  {
    const resources = this.motherLode.PurgeInactive(options);
    const objects = this.loadObjectCache.PurgeInactive(options);
    return Object.freeze({
      frame: resources.frame,
      time: resources.time,
      purged: resources.purged + objects.purged,
      payloadsReleased: resources.payloadsReleased + objects.payloadsReleased,
      cached: resources.cached + objects.cached,
      locked: resources.locked + objects.locked,
      purgedKeys: Object.freeze([ ...resources.purgedKeys, ...objects.purgedKeys ]),
      payloadKeys: Object.freeze([ ...resources.payloadKeys, ...objects.payloadKeys ]),
      cachedKeys: Object.freeze([ ...resources.cachedKeys, ...objects.cachedKeys ])
    });
  }

  /**
   * Replace or disable the opt-in automatic inactivity policy. Configuration
   * resets cadence, so the first subsequent pump performs a sweep immediately.
   * Frame-based limits are rejected because manager updates are not a reliable
   * renderer-frame clock. The normalized policy is a fresh object and never
   * reloads resources.
   *
   * @param {CjsResManAutoPurgePolicy|false|null} [policy=null] Time-based policy, or `false`/`null` to disable automatic sweeping.
   * @returns {BlueResMan} This resource manager.
   * @throws {TypeError} If the policy, threshold, cleanup control, or clock is invalid.
   */
  SetAutoPurgePolicy(policy = null)
  {
    this._autoPurgePolicy = normalizeAutoPurgePolicy(policy);
    this._lastAutoPurgeTime = null;
    return this;
  }

  /**
   * Return the immutable normalized automatic inactivity policy.
   *
   * @returns {Readonly<CjsResManAutoPurgePolicy>|null} Active policy, or `null` when automatic sweeping is disabled.
   */
  GetAutoPurgePolicy()
  {
    return this._autoPurgePolicy;
  }

  /**
   * Report whether {@link BlueResMan#Update} may run automatic inactivity
   * sweeps. This is a pure query and does not advance cadence or activity.
   *
   * @returns {boolean} Whether an automatic purge policy is configured.
   */
  IsAutoPurgeEnabled()
  {
    return this._autoPurgePolicy !== null;
  }

  /**
   * Run the configured automatic sweep when its minimum time interval has
   * elapsed. The first pump after configuration runs immediately. A regressing
   * clock rebases cadence and skips that pump; failures consume the interval so
   * repeated updates cannot form a cleanup-error storm. This method never
   * creates, fetches, prepares, or reloads a resource.
   *
   * @param {CjsResManAutoPurgePumpOptions} [options={}] Optional deterministic timestamp.
   * @returns {object|null} Immutable MotherLode purge result when due, otherwise `null`.
   * @throws {TypeError} If options, the clock result, or MotherLode purge policy are invalid.
   * @throws {AggregateError} If a due sweep cannot clean one or more inactive resources.
   */
  PumpAutoPurge(options = {})
  {
    const pump = normalizeAutoPurgePumpOptions(options);
    const policy = this._autoPurgePolicy;
    if (!policy) return null;

    const time = pump.time === undefined ? policy.now() : pump.time;
    assertNonNegativeNumber(time, "BlueResMan automatic purge time");

    if (this._lastAutoPurgeTime !== null)
    {
      if (time < this._lastAutoPurgeTime)
      {
        this._lastAutoPurgeTime = time;
        return null;
      }
      if (time - this._lastAutoPurgeTime < policy.intervalMilliseconds)
      {
        return null;
      }
    }

    this._lastAutoPurgeTime = time;
    return this.PurgeInactive({
      time,
      maxIdleMilliseconds: policy.maxIdleMilliseconds,
      payloadMaxIdleMilliseconds: policy.payloadMaxIdleMilliseconds,
      destroyAdapters: policy.destroyAdapters,
      releasePayload: policy.releasePayload,
      ...(policy.cleanup === undefined ? {} : { cleanup: policy.cleanup })
    });
  }

  /**
   * Resolve once every resource an object reaches has finished loading, so the
   * caller can keep the object hidden until it can be shown whole rather than
   * watch it build in pieces.
   *
   * Ours, not Carbon's. Carbon's nearest mechanism is `Tr2LoadPrepareFence`, a
   * marker in the load and prepare queues that
   * `EveSpaceObject2::PushRenderables` waits on through `Tr2Mesh::IsLoading`;
   * one slow resource then holds back every object queued after it. This is
   * the operator's ccpwgl `Tw2MotherLode.Watch` (fork commit `da5a9786`, 2020)
   * instead, so each object waits on its own resources only.
   *
   * Every manager update (`UpdateWatched`):
   *
   * - collects the object's resources again with `GetResources`, because
   *   resources finishing can add more (an effect resolves its textures);
   * - renews each one, so nothing is purged while the object waits;
   * - counts a resource pending until it finishes, PREPARED or FAILED. A
   *   PURGED one is pending, and renewing it starts its reload;
   * - fails a resource still EMPTY after `stallMilliseconds` with
   *   `CJS_RESOURCE_NEVER_STARTED`. A manager request never stays EMPTY, so
   *   such a resource is a stub or hand-built one that nothing will start, and
   *   it would otherwise hold the watch until the timeout.
   *
   * The watch resolves after two consecutive updates with nothing pending, so a
   * child requested by the update that finished its parent is still counted. A
   * failed resource does not hold it back: the object can be shown, and `failed`
   * lists what failed. After `timeoutMilliseconds` the promise rejects with
   * `CJS_RESOURCE_WATCH_TIMEOUT`, naming what was still pending.
   *
   * @param {object} root Object whose declared graph is watched.
   * @param {object} [options={}] Watch limits.
   * @param {number} [options.timeoutMilliseconds=60000] Give up after this long.
   * @param {number} [options.stallMilliseconds=10000] Fail a resource still EMPTY after this long.
   * @returns {Promise<{object: object, failed: BlueAsyncRes[]}>} The object, and the resources that failed.
   * @throws {TypeError} If the root is not an object or a limit is invalid.
   */
  Watch(root, options = {})
  {
    if (!root || typeof root !== "object") throw new TypeError("BlueResMan.Watch requires an object.");
    const timeoutMilliseconds = options.timeoutMilliseconds === undefined ? 60000 : options.timeoutMilliseconds;
    const stallMilliseconds = options.stallMilliseconds === undefined ? 10000 : options.stallMilliseconds;
    assertNonNegativeNumber(timeoutMilliseconds, "BlueResMan.Watch timeoutMilliseconds");
    assertNonNegativeNumber(stallMilliseconds, "BlueResMan.Watch stallMilliseconds");

    return new Promise((resolve, reject) =>
    {
      this._watches.push({
        root, resolve, reject, timeoutMilliseconds, stallMilliseconds,
        started: null, quietUpdates: 0, emptySince: new Map(), resources: []
      });
    });
  }

  /**
   * Stop watching an object. Its pending promises reject with
   * `CJS_RESOURCE_WATCH_CANCELLED`.
   *
   * @param {object} root The watched object.
   * @returns {boolean} Whether anything was watching it.
   */
  Unwatch(root)
  {
    let found = false;
    for (const watch of this._watches.slice())
    {
      if (watch.root !== root) continue;
      found = true;
      this._watches.splice(this._watches.indexOf(watch), 1);
      watch.reject(watchError("CJS_RESOURCE_WATCH_CANCELLED", "watch cancelled", []));
    }
    return found;
  }

  /**
   * Advance every watch by one update (see `Watch`). Runs from `Update`.
   *
   * @param {object} [options={}] Optional deterministic time.
   * @param {number} [options.time] Milliseconds; defaults to the wall clock.
   * @returns {number} How many watches settled.
   */
  UpdateWatched(options = {})
  {
    if (!this._watches.length) return 0;
    const time = options.time === undefined ? defaultAutoPurgeNow() : options.time;
    assertNonNegativeNumber(time, "BlueResMan.UpdateWatched time");

    let settled = 0;
    for (const watch of this._watches.slice())
    {
      if (watch.started === null) watch.started = time;
      const { pending, failed } = this._CountWatched(watch, time);

      watch.quietUpdates = pending.length ? 0 : watch.quietUpdates + 1;
      if (watch.quietUpdates >= 2)
      {
        this._watches.splice(this._watches.indexOf(watch), 1);
        watch.resolve({ object: watch.root, failed });
        settled += 1;
      }
      else if (time - watch.started >= watch.timeoutMilliseconds)
      {
        this._watches.splice(this._watches.indexOf(watch), 1);
        watch.reject(watchError("CJS_RESOURCE_WATCH_TIMEOUT",
          `watch timed out after ${time - watch.started} ms`, pending));
        settled += 1;
      }
    }
    return settled;
  }

  /**
   * Renew reachable resources while observing completion through pure native flags.
   *
   * @cjs
   * @implemented
   * @param {object} watch Existing graph-watch record.
   * @param {number} time Current manager time in milliseconds.
   * @returns {{pending: BlueAsyncRes[], failed: BlueAsyncRes[]}} Unfinished and failed resources.
   */
  _CountWatched(watch, time)
  {
    const pending = [];
    const failed = [];
    for (const resource of GetResources(watch.root, watch.resources))
    {
      resource.KeepAlive();
      const status = this.GetResourceStatus(resource);
      if (status.phase === "empty" && !resource._isLoading && !resource._isPrepared)
      {
        if (!watch.emptySince.has(resource)) watch.emptySince.set(resource, time);
        const waited = time - watch.emptySince.get(resource);
        if (waited < watch.stallMilliseconds)
        {
          pending.push(resource);
          continue;
        }
        const error = new Error("Resource never started: " + resource.GetPath());
        error.code = "CJS_RESOURCE_NEVER_STARTED";
        this._FailResourceLoad(resource, error);
      }
      if (!resource._isPrepared) pending.push(resource);
      else if (!resource._isGood) failed.push(resource);
    }
    return { pending, failed };
  }

  /**
   * Cancel the cached resources' pending loads and clear the owned cache and
   * read ledgers. Each load's queue entries go with it (`CancelPendingLoad`);
   * other entries stay queued, as Carbon's queues have no clear.
   *
   * @cjs
   * @implemented
   */
  Clear()
  {
    for (const lode of [ this.motherLode, this.loadObjectCache ])
    {
      for (const [, resource] of lode.Entries())
      {
        if (CjsSchema.cast(resource, IBlueResource)) resource.CancelPendingLoad();
      }
      lode.Clear();
    }
    this.sourceOperations = new WeakMap();
    this.formatOperations = new WeakMap();
    this._lastAutoPurgeTime = null;
    return this;
  }

  /**
   * Detach reusable source and parsed-format records for one source path.
   * Omitting `sourceRevision` removes every revision for the selected source;
   * supplying it removes only that string/finite-number revision. Existing
   * consumers keep their promises: invalidation does not abort, reject, touch
   * MotherLode/payload ownership, or perform source work.
   *
   * `Delete()` deliberately remains resource-identity-only. Use this method
   * when explicitly retained read caches must also be forgotten; `Clear()`
   * resets every read ledger.
   *
   * @param {string} path Carbon-style source resource path.
   * @param {CjsResManReadCacheOptions} [options={}] Optional `source` and exact `sourceRevision` selection.
   * @returns {{path: string, source: number, format: number}} Detached-record counts.
   * @throws {TypeError} If path, source, revision, or options are invalid.
   */
  InvalidateReadCache(path, options = {})
  {
    if (!options || typeof options !== "object" || Array.isArray(options))
    {
      throw new TypeError("BlueResMan.InvalidateReadCache options must be an object.");
    }
    const normalizedPath = normalizeResourcePath(path);
    const hasRevision = Object.hasOwn(options, "sourceRevision");
    const revisionKey = hasRevision
      ? normalizeSourceRevision(options.sourceRevision)
      : null;
    const source = options.source || this.source;
    if (!source)
    {
      return {
        path: normalizedPath,
        source: 0,
        format: 0
      };
    }
    // Host feature check: a source is supplied by the composing application.
    if ((typeof source !== "object" && typeof source !== "function")
      || typeof source.Read !== "function")
    {
      throw new TypeError("BlueResMan.InvalidateReadCache source must provide Read(path, options).");
    }

    return this._InvalidateReadCache(source, normalizedPath, revisionKey);
  }

  /**
   * Read source data under source/path/revision cache identity. Cache policy is
   * tri-state: omitted shares in-flight or explicitly retained work, `true`
   * retains success, and `false` bypasses sharing and retention. Failures are
   * never retained. A joining `true` request upgrades the shared record.
   *
   * `reload: true` invalidates the selected source/path synchronously before
   * beginning fresh work; it does not cancel already detached consumers.
   *
   * @param {string} path Carbon-style source resource path.
   * @param {CjsResManReadCacheOptions} [options={}] Source, revision, reload, and cache controls forwarded to the source.
   * @returns {Promise<*>} Promise for bytes or source-compatible data.
   * @throws {TypeError} If path, source, revision, cache policy, or options are invalid.
   */
  ReadResource(path, options = {})
  {
    const read = this._BeginReadOperation(path, options);
    return this._ReadResource(read.context, read.options);
  }

  /**
   * Normalize one source provenance context and invalidate stale path records
   * once at the outermost reload boundary.
   *
   * @param {string} path Source path.
   * @param {object} options Read options.
   * @returns {{context: Readonly<CjsResourceReadContext>, options: object}} Context and detached operation options.
   * @throws {TypeError} If source provenance or options are invalid.
   */
  _BeginReadOperation(path, options)
  {
    if (!options || typeof options !== "object" || Array.isArray(options))
    {
      throw new TypeError("BlueResMan read options must be an object.");
    }

    const normalizedPath = normalizeResourcePath(path);
    const inherited = READ_CONTEXTS.get(options);
    if (inherited && inherited.resMan === this && inherited.path === normalizedPath)
    {
      return { context: inherited, options };
    }

    // Carbon reads every file through BePaths (BlueAsyncRes::DoOpenStream,
    // BlueAsyncRes.cpp:377-387). An explicit source still overrides it.
    const source = options.source || this.source || this._bluePathsSource;
    // Host feature check: an explicit source is supplied by the composing application.
    if ((typeof source !== "object" && typeof source !== "function") || typeof source.Read !== "function")
    {
      throw new TypeError("BlueResMan requires a source with Read(path, options) to load objects.");
    }
    const sourceRevision = options.sourceRevision;
    const revisionKey = normalizeSourceRevision(sourceRevision);
    normalizeCachePolicy(options.cacheSource, "cacheSource");
    normalizeCachePolicy(options.cacheFormat, "cacheFormat");

    const operationOptions = { ...options };
    const ext = normalizeResourceExtension(
      options.ext || getResourceExtension(normalizedPath)
    );
    const fileName = getResourceFileName(normalizedPath);
    const context = {
      resMan: this,
      source,
      path: normalizedPath,
      resFilePath: normalizedPath,
      ext,
      fileName,
      url: null,
      sourcePath: normalizedPath,
      sourceRevision,
      revisionKey
    };
    READ_CONTEXTS.set(operationOptions, context);

    if (options.reload === true)
    {
      this._InvalidateReadCache(source, normalizedPath, null);
    }
    return { context, options: operationOptions };
  }

  /**
   * Run or join one normalized direct source operation.
   *
   * @param {Readonly<CjsResourceReadContext>} context Normalized provenance.
   * @param {object} options Detached read options.
   * @returns {Promise<*>} Promise for source bytes/data.
   */
  _ReadResource(context, options)
  {
    const cachePolicy = normalizeCachePolicy(options.cacheSource, "cacheSource");
    const operations = getOwnerOperations(this.sourceOperations, context.source, true);
    const key = getReadOperationKey(context);
    const bypassExisting = options.reload === true || cachePolicy === false;
    const existing = bypassExisting ? null : operations.get(key);
    if (existing)
    {
      if (cachePolicy === true) existing.retain = true;
      return existing.promise;
    }

    /** @type {CjsResourceReadOperationRecord} */
    const record = {
      promise: null,
      path: context.path,
      revisionKey: context.revisionKey,
      retain: cachePolicy === true
    };
    record.promise = Promise.resolve().then(() =>
      this.resourceLoader.Read(
        context.source,
        context.sourcePath,
        {
          ...options,
          resourcePath: context.path
        }
      )
    );
    if (cachePolicy !== false) operations.set(key, record);
    record.promise.then(() =>
    {
      if (cachePolicy !== false && !record.retain && operations.get(key) === record)
      {
        operations.delete(key);
      }
    }, () =>
    {
      if (cachePolicy !== false && operations.get(key) === record) operations.delete(key);
    });
    return record.promise;
  }

  /**
   * Remove future-reuse records matching one selected source and path.
   * A null revision removes all revisions.
   *
   * @param {object|Function} source Selected source.
   * @param {string} path Normalized source path.
   * @param {string|null} revisionKey Exact revision key or `null` for all.
   * @returns {{path: string, source: number, format: number}} Detached counts.
   */
  _InvalidateReadCache(source, path, revisionKey)
  {
    const sourceCount = removeOperationRecords(
      getOwnerOperations(this.sourceOperations, source, false),
      path,
      revisionKey
    );
    let format = 0;
    const descriptors = this.formatOperations.get(source);
    if (descriptors)
    {
      for (const [ descriptor, operations ] of descriptors)
      {
        format += removeOperationRecords(operations, path, revisionKey);
        if (operations.size === 0) descriptors.delete(descriptor);
      }
      if (descriptors.size === 0) this.formatOperations.delete(source);
    }
    return { path, source: sourceCount, format };
  }

  /**
   * Capture the configured route/request before native Initialize schedules loading.
   * Carbon inserts into MotherLode after Initialize (BlueResMan.cpp:286-288).
   *
   * @cjs
   * @implemented
   * @param {Function} Constructor
   * @param {string} path
   * @param {string} ext
   * @param {object} [options={}]
   * @param {object|null} [extensionRoute=null]
   * @returns {BlueAsyncRes}
   */
  CreateResource(Constructor, path, ext, options = {}, extensionRoute = null)
  {
    const resource = new Constructor();
    if (!CjsSchema.cast(resource, IBlueResource)) throw new TypeError("Resource factory must implement IBlueResource.");
    if (extensionRoute)
    {
      this._resourceExtensionRoutes.set(resource, extensionRoute);
    }
    const record = this._GetResourceRecord(resource);
    record.request = { ...options, ...getResourceLoaderOptions(options, options.source || this.source) };
    if (options.values) CjsSchema.setValues(resource, options.values);
    resource.Initialize(path, ext);
    return resource;
  }


  /**
   * Carbon's cache suffix is ex; it does not encode a semantic output kind.
   *
   * @cjs
   * @implemented
   * @param {object} [options={}] Request containing Carbon's ex suffix.
   * @returns {string} Validated suffix; other request options do not select identity.
   */
  GetResourceVariant(options = {})
  {
    if (!options || typeof options !== "object" || Array.isArray(options)) throw new TypeError("Resource options must be an object.");
    const ex = options.ex ?? "";
    if (typeof ex !== "string" || ex.includes("\u0000")) throw new TypeError("Resource ex must be a string without a null character.");
    return ex;
  }

  /**
   * Open one active resource mutation: while any is open, MotherLode cannot be
   * replaced underneath it (`Register`).
   *
   * @returns {() => void} Idempotent completion callback.
   */
  _BeginResourceOperation()
  {
    this._activeResourceOperations += 1;
    let finished = false;
    return () =>
    {
      if (finished) return;
      finished = true;
      this._activeResourceOperations = Math.max(0, this._activeResourceOperations - 1);
    };
  }


  /**
   * Run or join one format read under source/path/revision, registered descriptor,
   * and effective output-option identity. Descriptor identity prevents a
   * re-registration with different defaults from reusing an old parse, while
   * source identity prevents same-path reads from different sources colliding.
   *
   * `cacheFormat` uses the same tri-state policy as source caching: omitted is
   * in-flight by default, `true` retains success, and `false` bypasses sharing
   * and retention. `reload: true` never joins a prior parse. Failures are never
   * retained, and a joining `true` request upgrades a shared record. Requests
   * with option instances that cannot be represented safely bypass format
   * sharing regardless of cache policy.
   *
   * @param {BlueAsyncRes} resource Resource whose normalized path identifies the source data.
   * @param {object} descriptor Registered format descriptor.
   * @param {*} bytes Source bytes or source-compatible reader input.
   * @param {object} [options={}] Source provenance, reload, cacheFormat, emit, classes, and format options.
   * @returns {Promise<*>} Promise for the parsed or converted format result.
   * @throws {TypeError|Error} If resource, source, revision, descriptor, cache policy, or format execution is invalid.
   */
  ReadFormatOnce(resource, descriptor, bytes, options = {})
  {
    const read = this._BeginReadOperation(resource.GetPath(), options);
    const cachePolicy = normalizeCachePolicy(read.options.cacheFormat, "cacheFormat");
    const key = getFormatOperationKey(read.context, read.options);
    const cacheableOptions = key !== null && cachePolicy !== false;
    const descriptorOperations = cacheableOptions
      ? getFormatDescriptorOperations(
        this.formatOperations,
        read.context.source,
        descriptor,
        true
      )
      : null;
    const bypassExisting = read.options.reload === true
      || !cacheableOptions;
    const existing = bypassExisting ? null : descriptorOperations.get(key);
    if (existing)
    {
      if (cachePolicy === true) existing.retain = true;
      return existing.promise;
    }

    // Preserve caller option identities in the cache key, but snapshot construction
    // mappings before deferring dispatch so pending reads cannot observe later edits.
    const formatOptions = !descriptor.Format
      ? createFormatReadOptions(descriptor, read.options) : null;
    /** @type {CjsResourceReadOperationRecord} */
    const record = {
      promise: Promise.resolve().then(() => this.ReadFormat(descriptor, bytes, read.options, formatOptions)),
      path: read.context.path,
      revisionKey: read.context.revisionKey,
      retain: cachePolicy === true
    };
    if (cacheableOptions) descriptorOperations.set(key, record);
    record.promise.then(() =>
    {
      if (cacheableOptions
        && !record.retain
        && descriptorOperations.get(key) === record)
      {
        descriptorOperations.delete(key);
      }
    }, () =>
    {
      if (cacheableOptions
        && descriptorOperations.get(key) === record)
      {
        descriptorOperations.delete(key);
      }
    });
    return record.promise;
  }

  /** Manager-owned request, plain data and current asynchronous attempt. */
  _resourceRecords = new WeakMap();

  /** Current MotherLode time, published once per manager tick for fast renewal. */
  activityTime = 0;

  /** Maximum automatic revivals after purge; explicit Reload is never capped. */
  maxReloadAttempts = 3;

  /**
   * @cjs
   * @implemented
   * @param {BlueAsyncRes} resource @returns {object} Mutable manager-only record.
   */
  _GetResourceRecord(resource)
  {
    let record = this._resourceRecords.get(resource);
    if (!record)
    {
      record = { request: {}, payload: null, error: null, phase: "empty", purged: false, attempts: 0, operation: null };
      this._resourceRecords.set(resource, record);
    }
    return record;
  }

  /**
   * @cjs
   * @implemented
   * @param {BlueAsyncRes} resource @returns {object} Captured request; never stored on the resource.
   */
  _GetResourceRequest(resource)
  {
    const record = this._GetResourceRecord(resource);
    return record.operation?.request || record.request;
  }

  /**
   * @cjs
   * @implemented
   * @param {BlueAsyncRes} resource @returns {object|null} The active attempt token.
   */
  _GetResourceLoad(resource)
  {
    return this._GetResourceRecord(resource).operation;
  }

  /**
   * @cjs
   * @implemented
   * @param {BlueAsyncRes} resource @param {object|null} attempt @returns {boolean}
   */
  _IsResourceLoadCurrent(resource, attempt)
  {
    return attempt !== null && this._GetResourceRecord(resource).operation === attempt;
  }

  /**
   * Reject a cancelled result before a family mutates its owned data.
   *
   * @cjs
   * @implemented
   * @param {BlueAsyncRes} resource Resource whose lifecycle belongs to this manager.
   * @param {object|null} attempt Token captured before asynchronous work.
   * @returns {void}
   * @throws {Error} When the token was cancelled or superseded.
   */
  _AssertResourceLoad(resource, attempt)
  {
    if (!this._IsResourceLoadCurrent(resource, attempt))
    {
      const error = new Error("Cancelled resource load: " + resource.GetPath());
      error.code = "CJS_RESOURCE_LOAD_CANCELLED";
      throw error;
    }
  }

  /**
   * Start one native load attempt and retain its promise only until settlement.
   *
   * @cjs
   * @implemented
   * @param {BlueAsyncRes} resource Resource whose lifecycle belongs to this manager.
   * @returns {object} Attempt token holding its promise and temporary cache pin.
   */
  _StartResourceLoad(resource)
  {
    this._CancelResourceLoad(resource);
    const record = this._GetResourceRecord(resource);
    record.error = null;
    record.phase = "loading";
    record.purged = false;
    record.payload = null;
    this._objectBuilders.delete(resource);
    const operation = { request: record.request, promise: null, resolve: null, reject: null, locked: false, finish: this._BeginResourceOperation() };
    record.request = getResourceLoaderOptions(record.request, record.request.source);
    operation.promise = new Promise((resolve, reject) =>
    {
      operation.resolve = resolve;
      operation.reject = reject;
    });
    // GetResource starts the attempt even when nobody awaits it.
    operation.promise.catch(noop);
    record.operation = operation;
    if (resource.GetPath() && this._LodeOf(resource).Lookup(getMotherLodeKey(resource.GetPath(), resource.GetExt())) === resource)
    {
      this.LockResource(resource);
      operation.locked = true;
    }
    if (resource._isUrgent) this._TrackUrgentOperation(operation.promise);
    return operation;
  }

  /**
   * Cancel only this handle's current attempt; no replacement generation exists.
   *
   * @cjs
   * @implemented
   * @param {BlueAsyncRes} resource Resource whose lifecycle belongs to this manager.
   * @returns {void}
   */
  _CancelResourceLoad(resource)
  {
    const record = this._GetResourceRecord(resource);
    const operation = record.operation;
    if (!operation) return;
    record.operation = null;
    const error = new Error("Cancelled resource load: " + resource.GetPath());
    error.code = "CJS_RESOURCE_LOAD_CANCELLED";
    record.error = error;
    record.phase = "cancelled";
    operation.reject(error);
    if (operation.locked) this.UnlockResource(resource);
    operation.locked = false;
    operation.finish();
    operation.request = operation.resolve = operation.reject = operation.finish = null;
  }

  /**
   * Store a native attempt's failure for its MAIN-queue completion.
   *
   * @cjs
   * @implemented
   * @param {BlueAsyncRes} resource Resource whose lifecycle belongs to this manager.
   * @param {Error} error Failure retained for explicit inspection and promise rejection.
   * @returns {void}
   */
  _RecordResourceFailure(resource, error)
  {
    this._GetResourceRecord(resource).error = error;
  }

  /**
   * Settle promises before native callbacks, which may synchronously Reload.
   *
   * @cjs
   * @implemented
   * @param {BlueAsyncRes} resource Resource whose lifecycle belongs to this manager.
   * @returns {void}
   */
  _FinishResourceLoad(resource)
  {
    const record = this._GetResourceRecord(resource);
    const operation = record.operation;
    record.operation = null;
    record.phase = resource._isGood ? "prepared" : "failed";
    if (resource._isGood)
    {
      record.error = null;
      record.attempts = 0;
      this.KeepPayloadAlive(resource);
    }
    else if (!record.error)
    {
      record.error = new Error("Resource preparation failed: " + resource.GetPath());
    }
    if (resource._isGood) this._LogResourceEvent(resource, "prepared", "Prepared %s", resource.GetPath());
    else this._LogResourceEvent(resource, "failed", "Failed %s: %s", resource.GetPath(), record.error.message);
    if (!operation) return;
    if (resource._isGood) operation.resolve(resource.isResource ? resource : record.payload);
    else operation.reject(record.error);
    if (operation.locked) this.UnlockResource(resource);
    operation.locked = false;
    operation.finish();
    operation.request = operation.resolve = operation.reject = operation.finish = null;
  }

  /**
   * Fail a never-started or dynamic resource without adding a string-event state machine.
   *
   * @cjs
   * @implemented
   * @param {BlueAsyncRes} resource Resource whose lifecycle belongs to this manager.
   * @param {Error} error Failure retained for explicit inspection and promise rejection.
   * @returns {void}
   */
  _FailResourceLoad(resource, error)
  {
    this._RecordResourceFailure(resource, error);
    resource._isGood = false;
    resource._isPrepared = true;
    resource._isLoading = false;
    this._FinishResourceLoad(resource);
    resource._NotifyRebuildCachedData();
  }

  /**
   * Await the existing same-handle attempt. Failure never retries implicitly.
   * Reconstructing explicitly released plain data is an explicit read request.
   *
   * @cjs
   * @implemented
   * @param {BlueAsyncRes} resource
   * @returns {Promise<*>} Resource handle or the internal handler's plain result.
   */
  Ready(resource)
  {
    const record = this._GetResourceRecord(resource);
    if (record.purged)
    {
      resource.KeepAlive();
    }
    if (record.operation) return record.operation.promise;
    if (resource._isPrepared && !resource._isGood)
    {
      return Promise.reject(record.error || new Error("Resource failed: " + resource.GetPath()));
    }
    if (resource._isPrepared && resource._isGood)
    {
      if (resource.isResource || record.payload !== null)
      {
        this.KeepPayloadAlive(resource);
        return Promise.resolve(resource.isResource ? resource : record.payload);
      }
      resource.Reload();
      return this._GetResourceRecord(resource).operation.promise;
    }
    if (resource._isLoading) return this._StartResourceLoad(resource).promise;
    return Promise.reject(record.error || new Error("Resource has not been initialized: " + resource.GetPath()));
  }

  /**
   * Pure inspection of native flags plus manager-only failure and purge data.
   *
   * @cjs
   * @implemented
   * @param {BlueAsyncRes} resource Resource whose lifecycle belongs to this manager.
   * @returns {{phase: string, error: Error|null, purged: boolean, loading: boolean, prepared: boolean, good: boolean, reloadAttempts: number}} Detached inspection snapshot; no renewal or retry.
   */
  GetResourceStatus(resource)
  {
    const record = this._GetResourceRecord(resource);
    return { phase: record.phase, error: record.error, purged: record.purged,
      loading: resource._isLoading, prepared: resource._isPrepared, good: resource._isGood,
      reloadAttempts: record.attempts };
  }

  /**
   * Pure read of a loading object's retained builder: the decoded values
   * `LoadObject` builds each caller's object from. A resource keeps its data on
   * itself, so it has none.
   *
   * @cjs
   * @implemented
   * @param {BlueAsyncRes} resource A loading object in `loadObjectCache`, or a resource.
   * @returns {*} The builder, or null once released and for a resource.
   */
  GetResourcePayload(resource)
  {
    return resource.isResource ? null : this._GetResourceRecord(resource).payload;
  }

  /**
   * Whether a loading object's builder is still resident.
   *
   * @cjs
   * @implemented
   * @param {BlueAsyncRes} resource A loading object in `loadObjectCache`, or a resource.
   * @returns {boolean} Whether the builder is retained; false for a resource.
   */
  HasResourcePayload(resource)
  {
    return this.GetResourcePayload(resource) !== null;
  }

  /**
   * Release a loading object's builder without changing its identity; the next
   * `LoadObject` reads and parses again. MotherLode's idle sweep calls it. A
   * resource has none, so nothing happens.
   *
   * @cjs
   * @implemented
   * @param {BlueAsyncRes} resource A loading object in `loadObjectCache`, or a resource.
   * @returns {void}
   */
  ReleaseResourcePayload(resource)
  {
    if (resource.isResource) return;
    this._GetResourceRecord(resource).payload = null;
  }

  /**
   * Renew manager-owned plain/object data, without allocating a resource callback.
   *
   * @cjs
   * @implemented
   * @param {BlueAsyncRes} resource Resource whose lifecycle belongs to this manager.
   * @param {object} [options] Existing MotherLode activity frame/time overrides.
   * @returns {void}
   */
  KeepPayloadAlive(resource, options = {})
  {
    if (!resource.GetPath()) return;
    this._LodeOf(resource).KeepPayloadAlive(getMotherLodeKey(resource.GetPath(), resource.GetExt()), options);
  }

  /**
   * Logs one step of a resource's load on resMan's channel, with the
   * resource's MotherLode key (path plus `ex`) as the saga, so a log view can
   * fold one resource's story into one row: requested, read, decoded,
   * prepared, failed, purged, reloaded.
   *
   * Ours: Carbon logs only its own lines (`No factory found for extension` and
   * the rest), which stay as they are. These are additional, at
   * `LOGTYPE_INFO`, Carbon's lowest severity, and cost one check when no echo
   * listens.
   *
   * @cjs
   * @implemented
   * @param {BlueAsyncRes} resource The resource or loading object.
   * @param {string} event The step.
   * @param {string} format Printf format.
   * @param {...*} args Format arguments.
   * @returns {void}
   */
  _LogResourceEvent(resource, event, format, ...args)
  {
    if (!CcpLog.IsLogging(CcpLog.LogType.LOGTYPE_INFO)) return;
    // A resource made directly, with no path, has no MotherLode identity and
    // so no saga; it is not logged, and logging never throws.
    const path = resource.GetPath();
    if (!path) return;
    const data = { subtitle: "resMan", saga: getMotherLodeKey(path, resource.GetExt()), label: path, event };
    CcpLog.LogFuncChannel(s_ch, CcpLog.LogType.LOGTYPE_INFO, data, format, ...args);
  }

  /**
   * The cache a handle belongs to: `loadObjectCache` for an object load,
   * `motherLode` for a resource.
   *
   * @param {BlueAsyncRes} resource Resource or loading object.
   * @returns {MotherLode} Its cache.
   */
  _LodeOf(resource)
  {
    return this._objectLoads.has(resource) ? this.loadObjectCache : this.motherLode;
  }

  /**
   * Pin one resource against inactivity purge.
   *
   * @cjs
   * @implemented
   * @param {BlueAsyncRes} resource Resource whose lifecycle belongs to this manager.
   * @returns {number} Resulting lock count, or zero for an uncached/pathless resource.
   */
  LockResource(resource)
  {
    if (!resource.GetPath()) return 0;
    return this._LodeOf(resource).Lock(getMotherLodeKey(resource.GetPath(), resource.GetExt()));
  }

  /**
   * Release one balanced inactivity pin.
   *
   * @cjs
   * @implemented
   * @param {BlueAsyncRes} resource Resource whose lifecycle belongs to this manager.
   * @returns {number} Resulting lock count, or zero for an uncached/pathless resource.
   */
  UnlockResource(resource)
  {
    if (!resource.GetPath()) return 0;
    return this._LodeOf(resource).Unlock(getMotherLodeKey(resource.GetPath(), resource.GetExt()));
  }

  /**
   * Read the automatic purge-revival count.
   *
   * @cjs
   * @implemented
   * @param {BlueAsyncRes} resource Resource whose lifecycle belongs to this manager.
   * @returns {number} Automatic purge revival count.
   */
  GetReloadAttempts(resource)
  {
    return this._GetResourceRecord(resource).attempts;
  }

  /**
   * Explicitly reset the automatic revival budget.
   *
   * @cjs
   * @implemented
   * @param {BlueAsyncRes} resource Resource whose lifecycle belongs to this manager.
   * @returns {void}
   */
  ResetReloadAttempts(resource)
  {
    this._GetResourceRecord(resource).attempts = 0;
  }

  /**
   * Renew the timestamp; only policy purge triggers the native same-handle Reload.
   *
   * @cjs
   * @implemented
   * @param {BlueAsyncRes} resource Resource whose lifecycle belongs to this manager.
   * @param {object} [options] Existing MotherLode activity frame/time overrides.
   * @returns {void}
   */
  _KeepResourceAlive(resource, options)
  {
    // Render-target wrappers and directly built textures have no MotherLode identity.
    if (!resource.GetPath()) return;
    if (options === undefined && this.activityTime > 0) resource._lastUsedTime = this.activityTime;
    else this._LodeOf(resource).KeepAlive(getMotherLodeKey(resource.GetPath(), resource.GetExt()), options || {});
    const record = this._resourceRecords.get(resource);
    if (!record?.purged || record.attempts >= this.maxReloadAttempts) return;

    const lode = this._LodeOf(resource);
    const key = getMotherLodeKey(resource.GetPath(), resource.GetExt());
    const current = lode.Lookup(key);
    if (current && current !== resource) return;
    record.attempts += 1;
    resource.Reload();
    // Carbon initializes before insertion. The queued async load begins later.
    if (!current)
    {
      lode.Insert(key, resource);
      const operation = this._GetResourceLoad(resource);
      if (operation && !operation.locked)
      {
        this.LockResource(resource);
        operation.locked = true;
      }
    }
  }

  /**
   * Record data loss due to manager policy, distinct from a sticky load failure.
   *
   * @cjs
   * @implemented
   * @param {BlueAsyncRes} resource Resource whose lifecycle belongs to this manager.
   * @returns {void}
   */
  _MarkResourcePurged(resource)
  {
    this._LogResourceEvent(resource, "purged", "Purged %s", resource.GetPath());
    this._CancelResourceLoad(resource);
    const record = this._GetResourceRecord(resource);
    record.purged = true;
    record.phase = "purged";
    record.error = null;
    resource._isGood = false;
    resource._isPrepared = false;
    resource._isLoading = false;
  }

  /**
   * Release native owned data while retaining persistent targets for revival.
   *
   * @cjs
   * @implemented
   * @param {BlueAsyncRes} resource Cached resource.
   * @param {object} [options] Existing MotherLode cleanup policy.
   */
  _CleanupResource(resource, options = {})
  {
    resource.CancelPendingLoad();
    resource._NotifyReleaseCachedData();
    resource._OnShutdown(options);
    if (options.releasePayload !== false) this.ReleaseResourcePayload(resource);
    resource._isGood = resource._isPrepared = false;
  }

  /**
   * Read one internal object/data handler and retain only its builder or plain values.
   *
   * @cjs
   * @implemented
   * @param {BlueAsyncRes} resource Resource whose lifecycle belongs to this manager.
   * @returns {Promise<number>} Native success code after retaining decoded builder/plain data.
   */
  async _LoadObjectData(resource)
  {
    const attempt = this._GetResourceLoad(resource);
    const options = this._GetResourceRequest(resource);
    const bytes = resource._dataStream.data;
    const resolved = this._ResolveResourceObjectRead(resource, bytes, options);
    const decoded = await this._ReadResolvedResourceObjectPayload(resource, bytes, options, resolved);
    this._AssertResourceLoad(resource, attempt);
    const object = this._HydrateExtensionObject(resource, decoded, options, resolved);
    this._AssertResourceLoad(resource, attempt);
    const builder = this._objectBuilders.get(resource);
    this._GetResourceRecord(resource).payload = builder ? builder.values : object;
    if (builder)
    {
      delete builder.values;
    }
    return resource.constructor.LoadingResult.LR_SUCCESS;
  }

  /**
   * The prepare loop of `BlueResMan::Update` (BlueResMan.cpp:446-464): unthrottle
   * the background queue, run one main-queue entry, and repeat while under the
   * time slice or while more than `maxAllowedInPrepareQueue` are waiting.
   * `Update` reads its count and time for Carbon's statistics; `Wait` runs
   * it too. Nothing else runs prepare work.
   *
   * @param {object} [options={}] `maxTime` (seconds, default `maxPrepareTime`) and a `now` clock in milliseconds.
   * @returns {{processed: number, elapsed: number}} Entries run, and milliseconds spent.
   */
  _RunMainThreadQueue(options = {}) {
    const main = this._threadQueues[BlueResManQueue.BRMQ_MAIN];
    const background = this._threadQueues[BlueResManQueue.BRMQ_BACKGROUND];
    const now = typeof options.now === "function" ? options.now : defaultQueueNow;
    const timeSlice = (options.maxTime ?? this.maxPrepareTime) * 1000;
    const startedAt = now();
    let processed = 0;
    let elapsed = 0;

    // Urgent mode only flags queue entries; the slice holds whatever the mode
    // (BlueResMan.cpp:446-465).
    do
    {
      background.Unthrottle();
      const didSomething = main.Update();
      elapsed = now() - startedAt;
      if (!didSomething) break;
      ++processed;
    }
    while (elapsed < timeSlice || main.GetSize() > this.maxAllowedInPrepareQueue);

    return { processed, elapsed };
  }

}

// The notify surface arrives by composition rather than `extends
// CjsEventEmitter` - functional form so the resource tree stays plain ESM
// that loads from source without a transform.
meta.events(BlueResMan);

/**
 * Deep-copy supported registered format defaults into a detached snapshot.
 * Plain objects and arrays may be cyclic. Functions and primitives are stable
 * leaves; values with hidden mutable state are rejected because copying their
 * wrapper would not detach the state it represents.
 *
 * @param {object} defaults Registered format defaults.
 * @param {WeakMap<object, object>} [seen=new WeakMap()] Source-to-snapshot cycle map.
 * @returns {object} Detached plain defaults snapshot.
 * @throws {TypeError} If defaults contain unsupported objects, accessors, symbols, or byte buffers.
 */
function snapshotFormatDefaults(defaults, seen = new WeakMap())
{
  if (!defaults || typeof defaults !== "object" || Array.isArray(defaults))
  {
    throw new TypeError("BlueResMan format defaults must be a plain object.");
  }
  return snapshotFormatDefaultValue(defaults, seen, "defaults");
}

/**
 * Snapshot one value in a registered format-default tree.
 *
 * @param {*} value Source value.
 * @param {WeakMap<object, object>} seen Source-to-snapshot cycle map.
 * @param {string} path Diagnostic property path.
 * @returns {*} Snapshot value or stable primitive/function leaf.
 * @throws {TypeError} If the value cannot be made structurally immutable.
 */
function snapshotFormatDefaultValue(value, seen, path)
{
  if (value === null || value === undefined) return value;
  const type = typeof value;
  if ([ "string", "number", "boolean", "bigint" ].includes(type)) return value;
  if (type === "function") return value;
  if (type !== "object" || ArrayBuffer.isView(value) || value instanceof ArrayBuffer)
  {
    throw new TypeError(`BlueResMan format ${path} cannot be snapshotted immutably.`);
  }

  const prior = seen.get(value);
  if (prior) return prior;
  if (Array.isArray(value))
  {
    const snapshot = [];
    seen.set(value, snapshot);
    for (let index = 0; index < value.length; index += 1)
    {
      if (!Object.hasOwn(value, index))
      {
        throw new TypeError(`BlueResMan format ${path} must not contain sparse arrays.`);
      }
      snapshot.push(snapshotFormatDefaultValue(value[index], seen, `${path}[${index}]`));
    }
    return snapshot;
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null)
  {
    throw new TypeError(`BlueResMan format ${path} must contain only plain objects and arrays.`);
  }
  if (Object.getOwnPropertySymbols(value).length > 0)
  {
    throw new TypeError(`BlueResMan format ${path} must not contain symbol keys.`);
  }

  const snapshot = prototype === null ? Object.create(null) : {};
  seen.set(value, snapshot);
  for (const key of Object.getOwnPropertyNames(value))
  {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor.enumerable || !("value" in descriptor))
    {
      throw new TypeError(`BlueResMan format ${path}.${key} must be an enumerable data property.`);
    }
    snapshot[key] = snapshotFormatDefaultValue(descriptor.value, seen, `${path}.${key}`);
  }
  return snapshot;
}

/**
 * Normalize an opaque caller/source revision without interpreting content.
 * String and number tokens remain type-distinct; finite numeric `-0` and `0`
 * intentionally identify the same revision.
 *
 * @param {string|number|undefined} value Caller-provided source content token.
 * @returns {string} Type-stable internal revision key.
 * @throws {TypeError} If the token is neither a string nor finite number.
 */
function normalizeSourceRevision(value)
{
  if (value === undefined) return "undefined";
  if (typeof value === "string") return `string:${value}`;
  if (typeof value === "number" && Number.isFinite(value))
  {
    return `number:${Object.is(value, -0) ? 0 : value}`;
  }
  throw new TypeError("BlueResMan sourceRevision must be a string or finite number.");
}

/**
 * Validate tri-state source/format cache policy.
 *
 * @param {boolean|undefined} value Cache policy value.
 * @param {string} name Option name used in failures.
 * @returns {boolean|undefined} The validated policy.
 * @throws {TypeError} If the value is not boolean or omitted.
 */
function normalizeCachePolicy(value, name)
{
  if (value !== undefined && typeof value !== "boolean")
  {
    throw new TypeError(`BlueResMan ${name} must be a boolean when supplied.`);
  }
  return value;
}

/**
 * Get the operation map owned by one source object.
 *
 * @param {WeakMap<object|Function, Map<string, CjsResourceReadOperationRecord>>} ledger Source-keyed ledger.
 * @param {object|Function} owner Source owner.
 * @param {boolean} create Whether a missing map should be allocated.
 * @returns {Map<string, CjsResourceReadOperationRecord>|null} Owner map or `null`.
 */
function getOwnerOperations(ledger, owner, create)
{
  let operations = ledger.get(owner);
  if (!operations && create)
  {
    operations = new Map();
    ledger.set(owner, operations);
  }
  return operations || null;
}

/**
 * Get the source/path/revision operation key for one normalized read context.
 *
 * @param {Readonly<CjsResourceReadContext>} context Normalized provenance.
 * @returns {string} Internal read-operation key.
 */
function getReadOperationKey(context)
{
  return `${context.path}\u0000${context.revisionKey}`;
}

/**
 * Get the descriptor-specific format operation map for a selected source.
 * Descriptor identity isolates changed registration defaults.
 *
 * @param {WeakMap<object|Function, Map<object, Map<string, CjsResourceReadOperationRecord>>>} ledger Format ledger.
 * @param {object|Function} source Selected source owner.
 * @param {object} descriptor Registered descriptor.
 * @param {boolean} create Whether missing maps should be allocated.
 * @returns {Map<string, CjsResourceReadOperationRecord>|null} Descriptor map or `null`.
 */
function getFormatDescriptorOperations(ledger, source, descriptor, create)
{
  let descriptors = ledger.get(source);
  if (!descriptors && create)
  {
    descriptors = new Map();
    ledger.set(source, descriptors);
  }
  if (!descriptors) return null;

  let operations = descriptors.get(descriptor);
  if (!operations && create)
  {
    operations = new Map();
    descriptors.set(descriptor, operations);
  }
  return operations || null;
}

/**
 * Build a descriptor-local format cache key from source provenance and the
 * output options that materially affect the format reader result.
 * Requests containing non-canonical mutable option objects bypass format-cache
 * sharing instead of risking a false key match.
 *
 * @param {Readonly<CjsResourceReadContext>} context Normalized provenance.
 * @param {object} options Format request options.
 * @returns {string|null} Internal format-operation key, or `null` to bypass caching.
 */
function getFormatOperationKey(context, options)
{
  const material = [
    options.emit,
    options.outputStreams,
    options.classes,
    options.formatOptions
  ];
  if (!material.every(value => isCanonicalFormatCacheValue(value))) return null;
  return `${getReadOperationKey(context)}\u0000${material
    .map(value => serializeFormatCacheValue(value))
    .join("\u0001")}`;
}

/**
 * Return true when a format cache option can be represented without guessing
 * hidden mutable state. Plain objects/arrays, functions by identity, and
 * byte-addressable buffers/views are supported. Other class instances bypass
 * format-cache sharing.
 *
 * @param {*} value Candidate material format option.
 * @param {WeakSet<object|Function>} [seen=new WeakSet()] Cycle guard.
 * @returns {boolean} Whether deterministic cache serialization is supported.
 */
function isCanonicalFormatCacheValue(value, seen = new WeakSet())
{
  if (value === null || value === undefined) return true;
  if ([ "string", "number", "boolean", "bigint" ].includes(typeof value)) return true;
  if (typeof value === "function") return true;
  if (typeof value !== "object") return false;
  if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) return true;
  if (seen.has(value)) return true;
  seen.add(value);
  if (Array.isArray(value))
  {
    return value.every(entry => isCanonicalFormatCacheValue(entry, seen));
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  if (Object.getOwnPropertySymbols(value).length > 0) return false;
  return Object.getOwnPropertyNames(value).every(key =>
  {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor.enumerable
      && "value" in descriptor
      && isCanonicalFormatCacheValue(descriptor.value, seen);
  });
}

/**
 * Serialize one supported material format option with process-local identity
 * for objects and functions. Identity prevents same-named constructors and
 * separate option graphs from colliding; visible plain-object/array/buffer
 * contents ensure mutation changes the next operation key.
 *
 * @param {*} value Canonically supported format option.
 * @param {WeakSet<object|Function>} [seen=new WeakSet()] Cycle guard.
 * @returns {string} Deterministic cache-local representation.
 */
function serializeFormatCacheValue(value, seen = new WeakSet())
{
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "string") return `string:${JSON.stringify(value)}`;
  if (typeof value === "number")
  {
    if (Number.isNaN(value)) return "number:NaN";
    if (Object.is(value, -0)) return "number:-0";
    return `number:${String(value)}`;
  }
  if (typeof value === "boolean") return `boolean:${value}`;
  if (typeof value === "bigint") return `bigint:${value}`;
  if (typeof value === "function") return `function:${getLocalValueIdentity(value)}`;

  const identity = getLocalValueIdentity(value);
  if (seen.has(value)) return `reference:${identity}`;
  seen.add(value);
  if (ArrayBuffer.isView(value))
  {
    const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    return `view:${identity}:${[ ...bytes ].join(",")}`;
  }
  if (value instanceof ArrayBuffer)
  {
    return `buffer:${identity}:${[ ...new Uint8Array(value) ].join(",")}`;
  }
  if (Array.isArray(value))
  {
    return `array:${identity}:[${value
      .map(entry => serializeFormatCacheValue(entry, seen))
      .join(",")}]`;
  }
  return `object:${identity}:{${Object.keys(value)
    .sort()
    .map(key => `${JSON.stringify(key)}:${serializeFormatCacheValue(value[key], seen)}`)
    .join(",")}}`;
}

/**
 * Return a process-local identity for a parsed-format cache object or function.
 *
 * @param {object|Function} value Candidate option identity owner.
 * @returns {number} Stable identity for the life of the value.
 */
function getLocalValueIdentity(value)
{
  let identity = LOCAL_VALUE_IDENTITIES.get(value);
  if (!identity)
  {
    identity = nextLocalValueIdentity++;
    LOCAL_VALUE_IDENTITIES.set(value, identity);
  }
  return identity;
}

/**
 * Remove operation records matching a normalized path and optional revision.
 * Detached promises continue for their existing consumers.
 *
 * @param {Map<string, CjsResourceReadOperationRecord>|null} operations Candidate operation map.
 * @param {string} path Normalized source path.
 * @param {string|null} revisionKey Exact revision or `null` for all revisions.
 * @returns {number} Number of detached records.
 */
function removeOperationRecords(operations, path, revisionKey)
{
  if (!operations) return 0;
  let removed = 0;
  for (const [ key, record ] of operations)
  {
    if (record.path !== path) continue;
    if (revisionKey !== null && record.revisionKey !== revisionKey) continue;
    if (operations.delete(key)) removed += 1;
  }
  return removed;
}

/**
 * Copy the compact requested-output fields needed for explicit payload
 * reconstruction. This request is retained with the handle but never enters
 * MotherLode identity beyond Carbon's explicit `ex` suffix.
 *
 * @param {object} [options={}] Original resource request.
 * @returns {object} Shallow reconstruction request without cache/reload policy.
 */
function getResourceRequestOptions(options = {})
{
  const request = {};
  for (const key of RESOURCE_REQUEST_OPTION_KEYS)
  {
    if (options[key] !== undefined) request[key] = options[key];
  }
  // Capture the omitted suffix too: reconstruction cannot change a handle's identity.
  if (options.ext === undefined &&
    !RESOURCE_REQUEST_OPTION_KEYS.some(key => key !== "ex" && options[key] !== undefined))
    request.ex = options.ex ?? "";
  return request;
}

/**
 * Capture the compact output request plus effective source provenance needed
 * to reconstruct a released resource payload. Cache policy and one-shot reload
 * are intentionally not retained. Retaining the effective source prevents an
 * old revision token from being applied to a later manager default source.
 *
 * @param {object} [options={}] Requested output and source provenance options.
 * @param {object|Function|null} [effectiveSource=null] Source selected when the resource was created.
 * @returns {object} Detached loader options safe to retain with the resource.
 */
function getResourceLoaderOptions(options = {}, effectiveSource = null)
{
  const loaderOptions = getResourceRequestOptions(options);
  if (effectiveSource) loaderOptions.source = effectiveSource;
  for (const key of [ "sourceRevision", "ext" ])
  {
    if (Object.hasOwn(options, key))
    {
      loaderOptions[key] = options[key];
    }
  }
  return loaderOptions;
}

/**
 * Merge per-operation controls with a resource's compact reconstruction
 * request. Once the handle has a promised-output field, all output selectors
 * remain pinned to the retained request so `Ready()` cannot publish a
 * different result under the existing MotherLode identity. Retained source
 * provenance is pinned as well; cache/reload controls remain explicit per-call
 * overrides.
 *
 * @param {object} base Retained reconstruction request.
 * @param {object} [overrides={}] Per-call operation controls.
 * @returns {object} Merged request with stable promised-output fields.
 */
function mergeResourceLoaderOptions(base, overrides = {})
{
  const result = { ...base, ...overrides };
  const pinsOutput = RESOURCE_OUTPUT_OPTION_KEYS.some(key =>
    Object.hasOwn(base, key)
      && base[key] !== undefined
  );
  if (pinsOutput)
  {
    for (const key of RESOURCE_OUTPUT_OPTION_KEYS)
    {
      if (Object.hasOwn(base, key) && base[key] !== undefined)
      {
        result[key] = base[key];
      }
      else
      {
        delete result[key];
      }
    }
  }
  for (const key of RESOURCE_PROVENANCE_OPTION_KEYS)
  {
    if (Object.hasOwn(base, key)) result[key] = base[key];
  }
  return result;
}

/**
 * Filter current format descriptors using request material available before
 * source bytes are read. Byte-dependent support probes are deferred.
 *
 * @param {readonly object[]} descriptors Registered descriptors for one extension.
 * @param {object} options Format, output, and stream selection.
 * @returns {object[]} Matching descriptors in registration order.
 */
function filterFormatDescriptors(descriptors, options)
{
  let candidates = [ ...descriptors ];
  if (options.format)
  {
    candidates = candidates.filter(({ Format }) => Format === options.format || Format.id === options.format);
  }
  if (options.emit !== undefined)
  {
    candidates = candidates.filter(({ Format }) =>
      findDeclaredOutput(getFormatOutputs(Format), options.emit) !== null);
  }
  const streams = getRequestedStreams(options);
  if (streams)
  {
    candidates = candidates.filter(descriptor =>
    {
      const { Format } = descriptor;
      const emit = createFormatReadOptions(descriptor, options).emit;
      const capability = emit === undefined
        ? Object.values(Format.outputs || {}).find(entry => entry.default)
        : Format.outputs?.[findDeclaredOutput(getFormatOutputs(Format), emit)];
      return (capability?.outputStreams & streams) === streams;
    });
  }
  return candidates;
}

/**
 * Resolve an ordered explicit extension route. Probes are evaluated in route
 * order and the sole unprobed final descriptor is the fallback. Selection is
 * final: reader failures are never interpreted as a reason to try another
 * format.
 *
 * @param {readonly object[]} descriptors Captured ordered route descriptors.
 * @param {string} ext Normalized resource extension.
 * @param {object} options Output filters and source bytes.
 * @returns {object} Selected immutable format descriptor.
 */
function resolveOrderedExtensionFormatDescriptor(descriptors, ext, options)
{
  const candidates = filterFormatDescriptors(descriptors, options);
  if (descriptors.length > 0 && candidates.length === 0 && options.emit !== undefined)
  {
    throw createFormatOutputMissingError(ext, options.emit, descriptors);
  }
  if (candidates.length === 0)
  {
    const error = new Error(`No format registered for .${ext}`);
    error.code = "CJS_RESOURCE_FORMAT_MISSING";
    error.ext = ext;
    throw error;
  }

  for (const descriptor of candidates)
  {
    const { Format, defaults } = descriptor;
    if (typeof Format.is !== "function") return descriptor;
    const probeOptions = { ...defaults, ...(options.formatOptions || {}) };
    delete probeOptions.outputStreams;
    const report = Format.is(options.filename ?? null, options.bytes, probeOptions);
    if (isPositiveFormatProbe(report)) return descriptor;
  }

  const error = new Error(`No registered format supports the content for .${ext}`);
  error.code = "CJS_RESOURCE_FORMAT_UNSUPPORTED";
  error.ext = ext;
  error.formats = candidates.map(({ Format }) => requireRegisteredClassName(Format));
  throw error;
}

/** Tests the supported forms returned by current format probes. */
function isPositiveFormatProbe(report)
{
  if (report === true) return true;
  if (!report || report === false || typeof report !== "object") return false;
  return report.supported === true
    || report.supported === "full"
    || report.supported === "partial";
}

/**
 * Return one format facade's normal and diagnostic output declarations.
 *
 * @param {Function} Format Registered format facade.
 * @returns {Array<*>} Declared output values in selection order.
 */
function getFormatOutputs(Format)
{
  return Object.keys(Format.outputs || {});
}

/**
 * Resolve a case-insensitive output selector to its canonical declared
 * spelling. MotherLode tags stay lowercase while readers receive declarations
 * such as `cmfJson` or `gr2Json` exactly as authored.
 *
 * @param {readonly *[]} outputs Declared output values.
 * @param {*} requested Requested output selector.
 * @returns {string|null} Canonical declaration, or `null` when unsupported.
 */
function findDeclaredOutput(outputs, requested)
{
  const normalized = normalizeResourceVariant(requested);
  for (const output of outputs)
  {
    if (typeof output !== "string") continue;
    if (normalizeResourceVariant(output) === normalized) return output;
  }
  return null;
}

/**
 * Create the stable failure used when a registered input format cannot emit a
 * requested output tag.
 *
 * @param {string} ext Normalized source extension.
 * @param {*} emit Requested output tag.
 * @param {readonly object[]} descriptors Registered input-format descriptors.
 * @returns {Error} Contextual unsupported-output error.
 */
function createFormatOutputMissingError(ext, emit, descriptors)
{
  const error = new Error(`No format registered for .${ext} emits ${JSON.stringify(emit)}.`);
  error.code = "CJS_RESOURCE_FORMAT_OUTPUT_MISSING";
  error.ext = ext;
  error.emit = emit;
  error.formats = descriptors.map(({ Format }) => requireRegisteredClassName(Format));
  return error;
}

/**
 * Create the stable failure used when a direct object loader cannot satisfy a
 * forced output request.
 *
 * @param {string} ext Normalized source extension.
 * @param {*} emit Requested output tag.
 * @returns {Error} Contextual unsupported-output error.
 */
function createObjectLoaderOutputMissingError(ext, emit)
{
  const error = new Error(
    `Direct loader for .${ext} exposes only its unforced default; it does not emit ${JSON.stringify(emit)}.`
  );
  error.code = "CJS_RESOURCE_FORMAT_OUTPUT_MISSING";
  error.ext = ext;
  error.emit = emit;
  error.formats = [];
  return error;
}

/**
 * Resolve one descriptor from the current candidate set. When bytes are
 * present, support probes may disambiguate candidates.
 *
 * @param {readonly object[]} descriptors Candidate descriptors from current registration.
 * @param {string} ext Normalized resource extension.
 * @param {object} options Effective format options and optional source bytes.
 * @returns {object} Selected descriptor.
 * @throws {Error} If the candidate set is missing or remains ambiguous.
 */
function resolveFormatDescriptorCandidates(descriptors, ext, options)
{
  let candidates = [ ...descriptors ];
  if (candidates.length > 1 && options.bytes !== undefined)
  {
    const supported = candidates.filter(descriptor =>
    {
      const { Format, defaults } = descriptor;
      const isFormat = Format.is;
      if (typeof isFormat !== "function") return false;
      const report = isFormat.call(Format, options.filename ?? null, options.bytes, {
        ...defaults,
        ...(options.formatOptions || {})
      });
      return isPositiveFormatProbe(report);
    });
    if (supported.length === 1) candidates = supported;
  }

  if (candidates.length === 0)
  {
    const error = new Error(`No format registered for .${ext}`);
    error.code = "CJS_RESOURCE_FORMAT_MISSING";
    error.ext = ext;
    throw error;
  }
  if (candidates.length > 1)
  {
    const error = new Error(`Ambiguous formats registered for .${ext}`);
    error.code = "CJS_RESOURCE_FORMAT_AMBIGUOUS";
    error.ext = ext;
    error.formats = candidates.map(({ Format }) => requireRegisteredClassName(Format));
    throw error;
  }
  return candidates[0];
}


/**
 * Normalize one human-readable promised output tag.
 *
 * @param {*} value Candidate `variant`, `emit`, requirement, or payload tag.
 * @returns {string} Trimmed lowercase tag, or an empty string.
 * @throws {TypeError} If a non-empty tag is not a string or contains the internal key delimiter.
 */
function normalizeResourceVariant(value)
{
  if (value === null || value === undefined || value === "") return "";
  if (typeof value !== "string")
  {
    throw new TypeError("BlueResMan resource variant must be a string.");
  }
  const normalized = value.trim().toLowerCase();
  if (normalized.includes("\u0000"))
  {
    throw new TypeError("BlueResMan resource variant may not contain a null character.");
  }
  return normalized;
}

function createPrepareContext(resMan, resource, bytes, options, stage)
{
  return {
    ...options,
    ...createResourcePathContext(resource.GetPath(), READ_CONTEXTS.get(options), options.ext),
    stage,
    bytes,
    resource,
    resMan
  };
}

/**
 * Create the immutable, source-neutral path context shared by format readers,
 * direct object loaders, target identification, and target hydration.
 *
 * @param {string} path Normalized or caller-supplied resource path.
 * @param {CjsResourceReadContext|null|undefined} [readContext] Active source read context.
 * @returns {Readonly<{path: string, resFilePath: string, ext: string, fileName: string, url: string|null}>}
 */
function createResourcePathContext(path, readContext = null, extension = undefined)
{
  const resFilePath = normalizeResourcePath(path);
  return {
    path: resFilePath,
    resFilePath,
    ext: readContext?.ext ?? normalizeResourceExtension(extension || getResourceExtension(resFilePath)),
    fileName: getResourceFileName(resFilePath),
    url: readContext?.url ?? null
  };
}

/**
 * Return the normalized final component of a resource path without query or
 * fragment material.
 *
 * @param {string} path Resource path.
 * @returns {string} Lowercase normalized filename, or an empty string.
 */
function getResourceFileName(path)
{
  const normalized = normalizeResourcePath(path);
  const queryIndex = normalized.search(/[?#]/u);
  const cleanPath = queryIndex === -1 ? normalized : normalized.slice(0, queryIndex);
  const slashIndex = cleanPath.lastIndexOf("/");
  return cleanPath.slice(slashIndex + 1);
}


/**
 * Normalize an opt-in time-based automatic purge policy into a fresh object.
 *
 * @param {CjsResManAutoPurgePolicy|false|null} policy Caller policy or disable marker.
 * @returns {CjsResManAutoPurgePolicy|null} Normalized policy, or `null` when disabled.
 * @throws {TypeError} If fields, limits, cleanup controls, or the cadence clock are invalid.
 */
function normalizeAutoPurgePolicy(policy)
{
  if (policy === null || policy === undefined || policy === false) return null;
  if (!policy || typeof policy !== "object" || Array.isArray(policy))
  {
    throw new TypeError("BlueResMan autoPurgePolicy must be an object, false, or null.");
  }

  const allowed = new Set([
    "intervalMilliseconds",
    "maxIdleMilliseconds",
    "payloadMaxIdleMilliseconds",
    "destroyAdapters",
    "releasePayload",
    "cleanup",
    "now"
  ]);
  const unsupported = Object.keys(policy).filter(key => !allowed.has(key));
  if (unsupported.length)
  {
    throw new TypeError(`BlueResMan autoPurgePolicy does not support: ${unsupported.join(", ")}.`);
  }

  const intervalMilliseconds = policy.intervalMilliseconds ?? 1000;
  assertNonNegativeNumber(intervalMilliseconds, "BlueResMan autoPurgePolicy.intervalMilliseconds");
  for (const name of [ "maxIdleMilliseconds", "payloadMaxIdleMilliseconds" ])
  {
    if (policy[name] !== undefined)
    {
      assertNonNegativeNumber(policy[name], `BlueResMan autoPurgePolicy.${name}`);
    }
  }
  if (policy.maxIdleMilliseconds === undefined
    && policy.payloadMaxIdleMilliseconds === undefined)
  {
    throw new TypeError("BlueResMan autoPurgePolicy requires an identity or payload inactivity limit.");
  }
  for (const name of [ "destroyAdapters", "releasePayload" ])
  {
    if (policy[name] !== undefined && typeof policy[name] !== "boolean")
    {
      throw new TypeError(`BlueResMan autoPurgePolicy.${name} must be a boolean.`);
    }
  }
  if (policy.cleanup !== undefined
    && policy.cleanup !== false
    && typeof policy.cleanup !== "function")
  {
    throw new TypeError("BlueResMan autoPurgePolicy.cleanup must be a function or false.");
  }
  if (policy.now !== undefined && typeof policy.now !== "function")
  {
    throw new TypeError("BlueResMan autoPurgePolicy.now must be a function.");
  }

  return {
    intervalMilliseconds,
    maxIdleMilliseconds: policy.maxIdleMilliseconds,
    payloadMaxIdleMilliseconds: policy.payloadMaxIdleMilliseconds,
    destroyAdapters: policy.destroyAdapters ?? true,
    releasePayload: policy.releasePayload ?? true,
    ...(policy.cleanup === undefined ? {} : { cleanup: policy.cleanup }),
    now: policy.now || defaultAutoPurgeNow
  };
}

/**
 * Validate one automatic-purge pump request without advancing cadence.
 *
 * @param {CjsResManAutoPurgePumpOptions} options Per-call pump options.
 * @returns {CjsResManAutoPurgePumpOptions} Validated options.
 * @throws {TypeError} If options or an explicit timestamp are invalid.
 */
function normalizeAutoPurgePumpOptions(options)
{
  if (!options || typeof options !== "object" || Array.isArray(options))
  {
    throw new TypeError("BlueResMan automatic purge options must be an object.");
  }
  const unsupported = Object.keys(options).filter(key => key !== "time");
  if (unsupported.length)
  {
    throw new TypeError(`BlueResMan automatic purge options do not support: ${unsupported.join(", ")}.`);
  }
  if (options.time !== undefined)
  {
    assertNonNegativeNumber(options.time, "BlueResMan automatic purge time");
  }
  return options;
}

/**
 * Create the stable failure used when synchronous MotherLode replacement
 * would detach ownership beneath active asynchronous resource mutation.
 *
 * @param {number} activeOperations Number of queued and direct mutations.
 * @returns {Error} Contextual active-operation error.
 */
function activeResourceOperationsError(activeOperations)
{
  const error = new Error(
    `BlueResMan cannot replace MotherLode while ${activeOperations} resource operation(s) are active.`
  );
  error.code = "CJS_RESMAN_ACTIVE_RESOURCE_OPERATIONS";
  error.activeOperations = activeOperations;
  return error;
}


/**
 * Read a resource path for diagnostics without allowing an unusual custom
 * resource getter to hide the primary ownership error.
 *
 * @param {*} resource Candidate resource.
 * @returns {string} Best-effort resource path label.
 */
function getResourceDiagnosticPath(resource)
{
  try
  {
    return String(resource?.GetPath() || "<unknown>");
  }
  catch
  {
    return "<unknown>";
  }
}

/**
 * Perform no action for lifecycle-compatible optional operations.
 *
 * @returns {void}
 */
function noop() {}

/**
 * Merge snapshotted registration defaults with one request's format overrides.
 *
 * @param {object} descriptor Registered format descriptor.
 * @param {object} options Resource read options.
 * @returns {object} Effective format reader options.
 */
function createFormatReadOptions(descriptor, options)
{
  const Format = !descriptor.Format ? descriptor.constructor : descriptor.Format;
  const defaults = !descriptor.Format ? descriptor.GetValues() : descriptor.defaults;
  const formatOptions = {
    ...defaults,
    ...(options.formatOptions || {})
  };
  if (options.emit !== undefined)
  {
    formatOptions.emit = findDeclaredOutput(getFormatOutputs(Format), options.emit)
      ?? options.emit;
  }
  // Stream flags select a declared output; they are not decoder options.
  delete formatOptions.outputStreams;
  if (options.classes !== undefined) formatOptions.classes = options.classes;
  return !descriptor.Format ? descriptor.GetValues(formatOptions) : formatOptions;
}

/**
 * Tests whether an object owns one property.
 *
 * @param {*} object Candidate object.
 * @param {string|number|symbol} property Property key.
 * @returns {boolean}
 */

/**
 * Return the timestamp used by default automatic purge cadence: blue's host
 * clock, which does not follow wallclock adjustments.
 *
 * @returns {number} Host milliseconds.
 */
function defaultAutoPurgeNow()
{
  return BlueOS.Monotonic();
}

function defaultQueueYield()
{
  return new Promise(resolve => setTimeout(resolve, 0));
}

/** BeTimer's role in `BlueResMan::Update` (BlueResMan.cpp:446): Blue's host milliseconds. */
function defaultQueueNow()
{
  return BlueOS.Monotonic();
}

/**
 * LoadObject's cache: a second MotherLode, as Carbon's `m_loadObjectCache`
 * (BlueResMan.h:123), sized as `m_loadObjectCache.SetCacheSize` (BlueResMan.cpp:91).
 *
 * @param {number} cacheSize Byte budget.
 * @param {() => number} now The clock, in milliseconds.
 * @returns {MotherLode} The cache.
 */
function createLoadObjectCache(cacheSize, now)
{
  return new MotherLode({ now, cacheSize });
}

/**
 * resMan's two callback managers, indexed by `BlueResManQueue` (see
 * `BlueResMan._threadQueues`): the main queue with one slot, as Carbon's
 * `Update`-mode manager has, and the background queue with one async slot per
 * load in flight.
 *
 * @param {number} loadingThreadCount Background slots.
 * @param {Function} onBackgroundSlotFree Called when a background slot frees or the queue resumes.
 * @returns {BlueCallbackMan[]} The managers.
 */
function createThreadQueues(loadingThreadCount, onBackgroundSlotFree)
{
  const queues = [];

  const main = new BlueCallbackMan();
  main.SetName("resMan main");
  queues[BlueResManQueue.BRMQ_MAIN] = main;

  const background = new BlueCallbackMan();
  background.SetName("resMan background");
  background.SetThreadCount(loadingThreadCount);
  background.SetSlotFreeCallback(onBackgroundSlotFree);
  queues[BlueResManQueue.BRMQ_BACKGROUND] = background;

  return queues;
}

function normalizeRegistrationEntries(value)
{
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "function") return [ value ];
  if (typeof value !== "object")
  {
    throw new TypeError("BlueResMan registration collections must be arrays or objects.");
  }

  if (value.Format || value.format)
  {
    return [ value ];
  }

  return Object.entries(value).map(([ key, entry ]) =>
  {
    return typeof entry === "function" ? entry : { ...entry, key };
  });
}

/** Normalize `Register({ extensions })` into extension/registration pairs. */
function normalizeExtensionRegistrationEntries(value)
{
  if (value === null || value === undefined) return [];
  if (value instanceof Map)
  {
    return [ ...value.entries() ].map(([ ext, registration ]) => [
      ext,
      normalizeExtensionRegistration(registration)
    ]);
  }
  if (Array.isArray(value))
  {
    return value.map((registration, index) =>
    {
      if (!registration || typeof registration !== "object" || Array.isArray(registration))
      {
        throw new TypeError(`BlueResMan extensions[${index}] must be an object.`);
      }
      const ext = registration.extension || registration.ext;
      if (!ext)
      {
        throw new TypeError(`BlueResMan extensions[${index}] requires extension or ext.`);
      }
      return [ ext, normalizeExtensionRegistration(registration) ];
    });
  }
  if (!value || typeof value !== "object")
  {
    throw new TypeError("BlueResMan extensions must be an object, Map, or array.");
  }
  return Object.entries(value).map(([ ext, registration ]) => [
    ext,
    normalizeExtensionRegistration(registration)
  ]);
}

function normalizeExtensionRegistration(registration)
{
  if (typeof registration === "function") return { Handler: registration };
  if (!registration || typeof registration !== "object" || Array.isArray(registration))
  {
    throw new TypeError("BlueResMan extension registration must be a handler or object.");
  }
  return registration;
}

function normalizeExtensionRouteOptions(value)
{
  if (typeof value === "function") return { Format: value };
  if (Array.isArray(value)) return { Formats: value };
  if (value === null || value === undefined) return {};
  if (!value || typeof value !== "object")
  {
    throw new TypeError("BlueResMan extension route must be a format, format array, or object.");
  }
  return value;
}

function createFormatDescriptor(Format, defaults = {})
{
  if (typeof Format !== "function")
  {
    throw new TypeError("BlueResMan format descriptor requires a format class.");
  }
  return {
    Format,
    defaults: snapshotFormatDefaults(defaults)
  };
}

function createExtensionFormatDescriptor(entry, defaults, label)
{
  if (typeof entry === "function") return createFormatDescriptor(entry, defaults);
  if (!entry || typeof entry !== "object" || Array.isArray(entry))
  {
    throw new TypeError(`BlueResMan extension ${label} must be a format class or descriptor.`);
  }
  const Format = entry.Format || entry.format;
  return createFormatDescriptor(
    Format,
    entry.defaults === undefined ? defaults : entry.defaults
  );
}

function validateOrderedExtensionFormats(descriptors, ext)
{
  for (let index = 0; index < descriptors.length - 1; index++)
  {
    const Format = descriptors[index].Format;
    if (typeof Format.is !== "function")
    {
      throw new TypeError(
        `BlueResMan extension .${ext} format ${Format.name || index} has no support probe and must be last.`
      );
    }
  }
}

function assertExtensionTarget(Target, label)
{
  if (typeof Target !== "function"
    || (typeof Target.from !== "function" && typeof Target.fromYAML !== "function"
      && !CjsSchema.getClassName(Target)))
  {
    throw new TypeError(
      `BlueResMan extension ${label} must provide static from(values) or fromYAML(values, context), or be a registered schema class.`
    );
  }
}

function createExtensionTargetError(resource, message, cause = null)
{
  const path = getResourceDiagnosticPath(resource);
  const error = new Error(`BlueResMan extension target failed for ${path}: ${message}`, cause ? { cause } : undefined);
  error.code = "CJS_RESOURCE_EXTENSION_TARGET_FAILED";
  error.path = path;
  if (cause) error.cause = cause;
  return error;
}

// Carbon: `class BlueResMan : public IBlueResMan, public IBlueEvents`. Declared
// as calls - this folder cannot use decorator syntax (blue/blue/index.js).
// The Cjs prefix identifies browser adaptations (workers, fetch and routes);
// carbon metadata identifies the native service whose responsibility it carries.
CjsSchema.meta.inherit(IBlueResMan, IBlueEvents)(BlueResMan);
CjsSchema.exposure.mapInterface(IBlueResMan)(BlueResMan);

CjsSchema.decorateMethod(BlueResMan, "GetResource", blue.method);
CjsSchema.decorateMethod(BlueResMan, "GetResourceW", blue.method);
CjsSchema.decorateMethod(BlueResMan, "WaitUrgent", blue.method);
CjsSchema.decorateMethod(BlueResMan, "SaveObject", blue.method);
CjsSchema.decorateMethod(BlueResMan, "SaveObjectW", blue.method);
for (const method of [ "ReserveBackgroundLoadMemory", "ReleaseBackgroundLoadMemory" ])
{
  CjsSchema.decorateMethod(BlueResMan, method, blue.method, meta.noop);
}
CjsSchema.decorateMethod(BlueResMan, "SetUrgentResourceLoads", blue.method);
CjsSchema.decorateMethod(BlueResMan, "Wait", blue.method);
CjsSchema.decorateMethod(BlueResMan, "RegisterResourceConstructor", blue.method);
CjsSchema.decorateMethod(BlueResMan, "UnregisterResourceConstructor", blue.method);
CjsSchema.decorateMethod(BlueResMan, "LoadObject", blue.method);
CjsSchema.exposure.define("BlueResMan")(BlueResMan);


/**
 * Reads a file's bytes through `blue.paths`; a file no file system has is an
 * error naming the path (Carbon's DoOpenStream fails the load the same way).
 * The `?query` is the resource's own parameters: the file is opened without
 * it, as `DoOpenStream` opens `m_path.substr(0, query)` (BlueAsyncRes.cpp:380-384).
 *
 * @param {import("./IBluePaths.js").IBluePaths} paths The paths service.
 * @param {string} path Resource path.
 * @param {object} options Read options; `signal` aborts the read.
 * @returns {Promise<Uint8Array>} The bytes.
 */
async function readThroughBluePaths(paths, path, options)
{
  const query = path.indexOf("?");
  const filePath = query === -1 ? path : path.slice(0, query);
  const result = await paths.GetStreamFromPath(filePath, { accept: [ "bytes" ], signal: options.signal });
  if (result === null)
  {
    const error = new Error(`BlueResMan: no file system has ${path}.`);
    error.code = "CJS_RESMAN_FILE_NOT_FOUND";
    error.path = path;
    throw error;
  }
  return result.data;
}

/**
 * The callback-manager flags for a resource's tasks: urgent when the resource was
 * created in urgent mode (BlueAsyncRes.cpp:108-111, :217-226).
 *
 * @param {BlueAsyncRes} resource The resource.
 * @returns {number} `BCBF_URGENT` or `BCBF_NONE`.
 */
function urgentFlags(resource)
{
  return resource._isUrgent ? IBlueCallbackMan.BCBF_URGENT : IBlueCallbackMan.BCBF_NONE;
}

/** Resolve a request to Carbon StreamType flags. */
function getRequestedStreams(options)
{
  const streams = options.outputStreams ?? options.formatOptions?.outputStreams ?? 0;
  if (!Number.isInteger(streams) || streams < 0 || streams > StreamType.STREAM_AUDIO_VIDEO)
  {
    throw new TypeError("Resource outputStreams requires a valid StreamType mask.");
  }
  return streams;
}

/**
 * Invoke Carbon's IBlueObjectBuilder operation with the default object marker.
 * Shared by all internal handler records; no per-resource callback is allocated.
 * @param {IBlueObjectBuilder} builder Parsed object-file builder.
 * @returns {object} A new graph for one caller.
 */
function createObjectFromBuilder(builder)
{
  return builder.CreateObject(0);
}















































