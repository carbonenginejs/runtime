import { CjsMotherLode, getMotherLodeKey } from './CjsMotherLode.js';
import { CjsEventEmitter } from '@carbonenginejs/runtime-utils/model';
import { hasOwnThen } from '@carbonenginejs/runtime-utils/object';
import { normalizeResourcePath, normalizePath, normalizeResourceExtension, getResourceExtension } from '@carbonenginejs/runtime-utils/path';
import { CjsResource } from './resource/CjsResource.js';
import { ResourceHandlerMode } from './resource/ResourceHandlerMode.js';
import { CjsResManWorkQueue, CjsResManQueue } from './CjsResManWorkQueue.js';
import { CjsResManMainThreadLoader } from './worker/CjsResManMainThreadLoader.js';
import { CjsResManWorkerLoader } from './worker/CjsResManWorkerLoader.js';

/** @type {WeakMap<object, CjsResourceReadContext>} */
const READ_CONTEXTS = new WeakMap();

/** Small request fields retained only so a released payload can be rebuilt. */
const RESOURCE_REQUEST_OPTION_KEYS = Object.freeze(["variant", "requirement", "payload", "emit", "mediaType", "format", "classes", "formatOptions"]);

/** Requested-output fields pinned by a bound resource handle. */
const RESOURCE_OUTPUT_OPTION_KEYS = Object.freeze(["variant", "emit", "requirement", "payload"]);

/** Source provenance retained by a bound resource handle when present. */
const RESOURCE_PROVENANCE_OPTION_KEYS = Object.freeze(["source", "sourceRevision", "ext"]);

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
 * @property {CjsResMan} resMan Owning manager.
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
 * Opt-in time-based inactivity policy run by {@link CjsResMan#Update}.
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
 * Per-call controls for {@link CjsResMan#PumpAutoPurge}.
 *
 * @typedef {object} CjsResManAutoPurgePumpOptions
 * @property {number} [time] Explicit non-negative timestamp in milliseconds for deterministic pumping and sweeping.
 */

/**
 * Queue and automatic-purge controls accepted by {@link CjsResMan#Update}.
 * Top-level queue options remain a compatibility form for the prepare pump.
 *
 * @typedef {object} CjsResManUpdateOptions
 * @property {object} [background] Background queue pump options.
 * @property {object} [prepare] Main-thread prepare queue pump options.
 * @property {false|object} [cache] `false` skips recorded-byte housekeeping; otherwise supplies cache-cleanup policy.
 * @property {false|CjsResManAutoPurgePumpOptions} [purge] `false` skips this update's automatic sweep; otherwise supplies its timestamp.
 */

/**
 * Snapshot-fence controls accepted by {@link CjsResMan#Wait}.
 *
 * The default pump uses the manager's ordinary queue budgets and honors queue
 * pause state. `pump: false` leaves all progress to an external driver. The
 * yield callback is used only while this call is pumping and may return either
 * a promise or an immediate value.
 *
 * @typedef {object} CjsResManWaitOptions
 * @property {boolean} [pump=true] Whether this call pumps the two queues while awaiting its snapshot.
 * @property {object} [background] Options forwarded to `PumpBackgroundQueue`.
 * @property {object} [prepare] Options forwarded to `PumpMainThreadQueue`.
 * @property {() => (*|Promise<*>)} [yield] Cooperative wait between pump attempts.
 */

/**
 * Immutable authority captured by asynchronous work that may mutate a
 * canonical resource. A generation changes whenever ResMan removes and later
 * rebinds the same JavaScript handle, even when owner and key are reused.
 *
 * @typedef {object} CjsResourceOwnership
 * @property {number} generation Manager-local ownership generation.
 * @property {CjsMotherLode} owner Exact registry that owns the resource.
 * @property {string} key Exact canonical registry identity.
 * @property {object|Function} resource Canonical resource handle.
 */

/**
 * Immutable authority for one off-registry reload candidate.
 *
 * The newest generation for a canonical key is the only candidate permitted
 * to commit. `expectedOwnership` keeps the former canonical handle protected
 * by the same exact-owner generation checks used by ordinary asynchronous
 * resource work.
 *
 * @typedef {object} CjsResourceReloadCandidate
 * @property {true} reloadCandidate Distinguishes staged authority from canonical ownership.
 * @property {number} generation Manager-local reload request generation.
 * @property {CjsMotherLode} owner Exact registry expected to receive the candidate.
 * @property {string} key Exact canonical registry identity.
 * @property {object|Function} expected Former canonical resource preserved until commit.
 * @property {CjsResourceOwnership} expectedOwnership Captured authority of the former owner.
 * @property {object|Function} resource Off-registry candidate resource.
 * @property {Readonly<object>} loaderOptions Durable identity/source options restored after commit.
 */

/**
 * Hidden authority accepted by guarded CPU read/publication helpers.
 *
 * @typedef {CjsResourceOwnership|CjsResourceReloadCandidate} CjsResourceMutationAuthority
 */

class CjsResMan extends CjsEventEmitter {
  #autoPurgePolicy = null;
  #activeResourceOperations = 0;
  #invalidResourceOwnership = new WeakSet();
  #lastAutoPurgeTime = null;
  #nextResourceReloadGeneration = 1;
  #nextResourceOwnershipGeneration = 1;
  #nextResourceOperationId = 1;
  #queueOperations = new Map();
  #resourceOwnership = new WeakMap();
  #resourceOperations = new Map();
  #reloadCandidates = new WeakMap();
  #reloadGenerations = new Map();
  #reloadOperations = new WeakMap();
  #extensionRoutes = new Map();
  #resourceExtensionRoutes = new WeakMap();
  #resourceHandlerModes = new WeakMap();

  /**
   * Create a GPU-free resource manager and apply its initial registration.
   *
   * @param {object} [options={}] Configuration forwarded to {@link CjsResMan#Register}.
   * @throws {TypeError} If registration, queue, source, or format options are invalid.
   */
  constructor(options = {}) {
    super();
    this.motherLode = new CjsMotherLode();
    this.source = null;
    this.paths = new Map();
    this.pathResolver = null;
    this.resourceTypes = new Map();
    this.objectLoaders = new Map();
    this.formats = new Map();
    this.objectOperations = new WeakMap();
    this.sourceOperations = new WeakMap();
    this.queuedSourceOperations = new WeakMap();
    this.formatOperations = new WeakMap();
    this.mainThreadLoader = new CjsResManMainThreadLoader();
    this.workerLoader = new CjsResManWorkerLoader({
      fallback: this.mainThreadLoader
    });
    this.resourceLoader = this.workerLoader;
    this.maxConcurrentLoads = 8;
    this.maxPrepareTime = 0.005;
    this.maxPrepareItemsPerTick = 0;
    this.autoPumpMainThreadQueue = true;
    this.queueScheduler = defaultQueueScheduler;
    this.urgentResourceLoads = false;
    this._backgroundPumpScheduled = false;
    this._mainThreadPumpScheduled = false;
    this._loadQueue = new CjsResManWorkQueue(CjsResManQueue.BACKGROUND, {
      concurrency: this.maxConcurrentLoads,
      onReady: () => this.ScheduleBackgroundQueue()
    });
    this._prepareQueue = new CjsResManWorkQueue(CjsResManQueue.MAIN, {
      concurrency: 1,
      onReady: () => this.ScheduleMainThreadQueue()
    });
    this.Register(options);
  }

  /**
   * Add or replace resource-manager configuration.
   *
   * The same options object can be forwarded unchanged by CjsLibrary. Format
   * classes continue to own their input extensions; resource types are keyed
   * by semantic requirements such as "texture", "image", or "geometry".
   * Replacing MotherLode shuts down and cleans the former owner before the new
   * registry is activated. Replacement is rejected while queued or direct
   * resource mutations are active so a synchronous configuration call cannot
   * detach ownership underneath asynchronous publication. Normal `Wait()`
   * drains queued roots only; direct callers must await their own promises.
   *
   * @param {object} [options={}] Additive source, registry, queue, format, and resource-type settings.
   * @param {number} [options.cacheSize] Recorded-byte budget immediately installed on the active MotherLode.
   * @param {object} [options.cacheCleanup] Cleanup policy used if a smaller configured budget evicts cached identities.
   * @param {object} [options.mainThreadLoader] Direct execution strategy.
   * @param {object|Map<string,string>} [options.paths] Resource-prefix URL bases.
   * @param {object|Map|object[]} [options.extensions] Extension route registrations.
   * @param {Function|null} [options.pathResolver] Optional complete resource-path-to-URL resolver.
   * @param {object} [options.workerLoader] Worker loader instance or construction options.
   * @param {boolean} [options.useWorkerLoading=true] Whether worker-backed execution is selected.
   * @returns {CjsResMan} This resource manager.
   * @throws {TypeError} If options or any configured component are invalid.
   * @throws {Error|AggregateError} If resource mutations are active or replacing MotherLode cannot clean its resources.
   */
  Register(options = {}) {
    if (!options || typeof options !== "object" || Array.isArray(options)) {
      throw new TypeError("CjsResMan.Register options must be an object.");
    }
    hasOwnThen(options, {
      motherLode: value => {
        const nextMotherLode = value || new CjsMotherLode();
        if (nextMotherLode !== this.motherLode) {
          if (this.#activeResourceOperations > 0) {
            throw activeResourceOperationsError(this.#activeResourceOperations);
          }
          const previousMotherLode = this.motherLode;
          this.#InvalidateMotherLodeOwnership(previousMotherLode);
          previousMotherLode?.Shutdown?.();
          this.motherLode = nextMotherLode;
          this.motherLode.Startup?.();
          this.#BindMotherLodeResources();
          this.#reloadGenerations.clear();
          this.#lastAutoPurgeTime = null;
        }
      },
      cacheSize: value => this.motherLode.SetCacheSize(value, options.cacheCleanup || {}),
      autoPurgePolicy: this.SetAutoPurgePolicy,
      source: this.SetSource,
      paths: this.SetPaths,
      pathResolver: this.SetPathResolver,
      mainThreadLoader: this.SetMainThreadLoader,
      workerLoader: this.SetWorkerLoader,
      useWorkerLoading: this.UseWorkerLoading,
      maxConcurrentLoads: value => {
        assertPositiveInteger(value, "maxConcurrentLoads");
        this.maxConcurrentLoads = value;
        this._loadQueue.SetConcurrency(value);
      },
      maxPrepareTime: value => {
        assertNonNegativeNumber(value, "maxPrepareTime");
        this.maxPrepareTime = value;
      },
      maxPrepareItemsPerTick: value => {
        assertNonNegativeInteger(value, "maxPrepareItemsPerTick");
        this.maxPrepareItemsPerTick = value;
      },
      autoPumpMainThreadQueue: value => {
        this.autoPumpMainThreadQueue = Boolean(value);
      },
      queueScheduler: value => {
        if (value !== null && typeof value !== "function") {
          throw new TypeError("CjsResMan queueScheduler must be a function or null.");
        }
        this.queueScheduler = value || defaultQueueScheduler;
      },
      urgentResourceLoads: this.SetUrgentResourceLoads
    }, this);
    for (const entry of normalizeRegistrationEntries(options.formats)) {
      if (typeof entry === "function") this.RegisterFormat(entry);else this.RegisterFormat(entry.Format || entry.format, entry.defaults || {});
    }
    for (const entry of normalizeRegistrationEntries(options.resourceTypes, true)) {
      if (typeof entry === "function") this.RegisterResourceType(entry);else this.RegisterResourceType(entry.requirement || entry.payload || entry.key, entry.Constructor || entry.Resource || entry.resourceType, entry);
    }
    for (const [ext, loader] of Object.entries(options.objectLoaders || {})) {
      this.RegisterObjectLoader(ext, loader);
    }
    for (const [ext, registration] of normalizeExtensionRegistrationEntries(options.extensions)) {
      const {
        Handler,
        handler,
        ...routeOptions
      } = registration;
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
   * @returns {CjsResMan} This resource manager.
   */
  SetSource(source) {
    this.source = source || null;
    return this;
  }

  /**
   * Add or replace one resource-prefix URL base.
   *
   * @param {string} prefix Resource scheme without `:/`.
   * @param {string} urlBase URL base ending at the scheme root.
   * @returns {CjsResMan} This resource manager.
   */
  SetPath(prefix, urlBase) {
    const key = normalizePathPrefix(prefix);
    const value = normalizeUrlBase(urlBase);
    this.paths.set(key, value);
    return this;
  }

  /**
   * Add or replace resource-prefix URL bases from an object or Map.
   *
   * @param {object|Map<string,string>} paths Prefix/base entries.
   * @returns {CjsResMan} This resource manager.
   */
  SetPaths(paths) {
    if (!paths || typeof paths !== "object" && !(paths instanceof Map) || Array.isArray(paths)) {
      throw new TypeError("CjsResMan paths must be an object or Map.");
    }
    const entries = paths instanceof Map ? paths.entries() : Object.entries(paths);
    for (const [prefix, urlBase] of entries) {
      this.SetPath(prefix, urlBase);
    }
    return this;
  }

  /**
   * Reports whether a resource-prefix URL base is registered.
   *
   * @param {string} prefix Resource scheme without `:/`.
   * @returns {boolean}
   */
  HasPath(prefix) {
    return this.paths.has(normalizePathPrefix(prefix));
  }

  /**
   * Returns one registered resource-prefix URL base.
   *
   * @param {string} prefix Resource scheme without `:/`.
   * @returns {string|null}
   */
  GetPath(prefix) {
    return this.paths.get(normalizePathPrefix(prefix)) || null;
  }

  /**
   * Replaces the complete resource-path-to-URL resolver.
   *
   * @param {Function|null} resolver Resolver called as `(resourcePath, resMan)`.
   * @returns {CjsResMan} This resource manager.
   */
  SetPathResolver(resolver) {
    if (resolver !== null && resolver !== undefined && typeof resolver !== "function") {
      throw new TypeError("CjsResMan pathResolver must be a function or null.");
    }
    this.pathResolver = resolver || null;
    return this;
  }

  /**
   * Builds the URL used by URL-backed providers while preserving the resource
   * path as the canonical resource identity.
   *
   * @param {string} path Resource path or direct HTTP(S) URL.
   * @returns {string} Resolved URL.
   */
  BuildUrl(path) {
    const normalized = normalizeResourcePath(path);
    if (!normalized) {
      throw new TypeError("CjsResMan resource path must be a non-empty string.");
    }
    if (this.pathResolver) {
      return normalizeResolvedUrl(this.pathResolver(normalized, this));
    }
    const prefixIndex = normalized.indexOf(":/");
    if (prefixIndex === -1) {
      return normalizePath(path);
    }
    const prefix = normalized.slice(0, prefixIndex);
    if (prefix === "http" || prefix === "https") {
      return normalizePath(path);
    }
    const urlBase = this.paths.get(prefix);
    if (!urlBase) {
      const error = new Error(`CjsResMan resource path prefix is not registered: ${prefix}`);
      error.code = "CJS_RESMAN_PATH_PREFIX_UNREGISTERED";
      error.path = normalized;
      error.prefix = prefix;
      throw error;
    }
    return `${urlBase}${normalized.slice(prefixIndex + 2)}`;
  }

  /**
   * Replace the direct execution strategy used by unsupported worker
   * operations and whenever worker loading is not selected.
   *
   * @param {object} loader Loader exposing `Read` and `ReadFormat`.
   * @returns {CjsResMan} This resource manager.
   */
  SetMainThreadLoader(loader) {
    assertResourceLoader(loader, "mainThreadLoader");
    const wasSelected = this.resourceLoader === this.mainThreadLoader;
    this.mainThreadLoader = loader;
    this.workerLoader?.SetFallback?.(loader);
    if (wasSelected || !this.resourceLoader) this.resourceLoader = loader;
    return this;
  }

  /**
   * Install a worker loader instance or construct one from options.
   *
   * Installation does not select worker execution; call
   * `UseWorkerLoading(true)` or pass `useWorkerLoading: true`.
   *
   * @param {object|null} loader Worker loader or CjsResManWorkerLoader options.
   * @returns {CjsResMan} This resource manager.
   */
  SetWorkerLoader(loader) {
    const wasSelected = this.resourceLoader === this.workerLoader;
    if (loader === null || loader === false) {
      this.workerLoader = null;
      if (wasSelected) this.resourceLoader = this.mainThreadLoader;
      return this;
    }
    const resolved = isResourceLoader(loader) ? loader : new CjsResManWorkerLoader({
      ...(loader || {}),
      fallback: loader?.fallback || this.mainThreadLoader
    });
    assertResourceLoader(resolved, "workerLoader");
    this.workerLoader = resolved;
    if (wasSelected) this.resourceLoader = resolved;
    return this;
  }

  /**
   * Select worker-backed execution, lazily creating the default module worker
   * loader when required. Unsupported sources and formats still use the
   * configured main-thread loader.
   *
   * @param {boolean} [value=true] Whether worker execution is selected.
   * @returns {CjsResMan} This resource manager.
   */
  UseWorkerLoading(value = true) {
    if (!value) {
      this.resourceLoader = this.mainThreadLoader;
      return this;
    }
    if (!this.workerLoader) this.SetWorkerLoader({});
    this.workerLoader.Reset?.();
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
    return this.workerLoader?.GetPendingCount?.() || 0;
  }

  /**
   * Enqueues a resource task on the selected execution lane for the resource
   * manager.
   */
  AddToQueue(queue, callback, context = null, flags = 0) {
    const task = this.QueueTask(queue, callback, context, {
      flags
    });
    task.promise.catch(error => {
      this.EmitEvent?.("queueerror", this, task.queue, task.id, error);
    });
    return task.id;
  }

  /** Cancels a queued resource task before it starts for the resource manager. */
  CancelFromQueue(queue, id, reason = "") {
    return this.GetWorkQueue(queue).Cancel(id, reason);
  }

  /**
   * Allocates the next task identifier for a selected queue for the resource
   * manager.
   */
  GetNextIdForQueue(queue) {
    return this.GetWorkQueue(queue).GetNextId();
  }

  /**
   * Starts pending preparation work within the main-thread concurrency limit for
   * the resource manager.
   */
  PumpMainThreadQueue(options = {}) {
    const urgent = options.urgent === true || this.urgentResourceLoads;
    const result = this._prepareQueue.Pump({
      maxItems: urgent ? 0 : options.maxItems ?? this.maxPrepareItemsPerTick,
      maxTime: urgent ? 0 : (options.maxTime ?? this.maxPrepareTime) * 1000,
      now: options.now
    });
    if (result.queued > 0 && result.active === 0) this.ScheduleMainThreadQueue();
    return result.processed > 0;
  }

  /**
   * Starts pending load work within the background concurrency limit for the
   * resource manager.
   */
  PumpBackgroundQueue(options = {}) {
    const result = this._loadQueue.Pump({
      maxItems: options.maxItems ?? 0,
      maxTime: options.maxTime === undefined ? 0 : options.maxTime * 1000,
      now: options.now
    });
    return result.processed > 0;
  }

  /**
   * Prevents the selected queue from starting additional work for the resource
   * manager.
   */
  PauseQueue(queue) {
    this.GetWorkQueue(queue).Pause();
    return this;
  }

  /**
   * Allows the selected queue to start pending work again for the resource
   * manager.
   */
  ResumeQueue(queue) {
    const name = CjsResManWorkQueue.normalizeName(queue);
    this.GetWorkQueue(name).Resume();
    if (name === CjsResManQueue.MAIN) this.ScheduleMainThreadQueue();else this.ScheduleBackgroundQueue();
    return this;
  }

  /**
   * Returns the number of load tasks waiting or running for the resource
   * manager.
   */
  GetPendingLoads() {
    return this._loadQueue.GetPendingCount();
  }

  /**
   * Returns the number of preparation tasks waiting or running for the resource
   * manager.
   */
  GetPendingPrepares() {
    return this._prepareQueue.GetPendingCount();
  }

  /**
   * Returns queue counts and concurrency state for diagnostics for the resource
   * manager.
   */
  GetQueueStats(queue = null) {
    if (queue !== null && queue !== undefined) return this.GetWorkQueue(queue).GetStats();
    return Object.freeze({
      loads: this._loadQueue.GetStats(),
      prepares: this._prepareQueue.GetStats()
    });
  }

  /**
   * Switches resource loading between normal and urgent concurrency policy for
   * the resource manager.
   */
  SetUrgentResourceLoads(value) {
    this.urgentResourceLoads = Boolean(value);
    return this;
  }

  /**
   * Reports whether urgent resource-load scheduling is active for the resource
   * manager.
   */
  IsUrgentResourceLoads() {
    return this.urgentResourceLoads;
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
   * @param {CjsResManUpdateOptions} [options={}] Queue budgets and optional automatic-purge controls.
   * @returns {boolean} Whether queue work ran or housekeeping released owned state.
   * @throws {TypeError} If queue, cache, purge timing, or MotherLode policy options are invalid.
   * @throws {AggregateError} If cache or inactivity housekeeping cannot clean one or more resources.
   */
  Update(options = {}) {
    const loaded = this.PumpBackgroundQueue(options.background || {});
    const prepared = this.PumpMainThreadQueue(options.prepare || options);
    const cacheOptions = options.cache === true || options.cache === undefined ? {} : options.cache;
    const cacheResult = options.cache === false ? null : this.motherLode.TrimCache?.(cacheOptions);
    const trimmed = Boolean(cacheResult && cacheResult.evicted > 0);
    const purgeOptions = options.purge === true || options.purge === undefined ? {} : options.purge;
    const purgeResult = options.purge === false ? null : this.PumpAutoPurge(purgeOptions);
    const purged = Boolean(purgeResult && (purgeResult.purged > 0 || purgeResult.payloadsReleased > 0));
    return loaded || prepared || trimmed || purged;
  }

  /**
   * Compatibility alias for {@link CjsResMan#Update}. It uses the same queue
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
   * Wait for the manager work that exists when this method is called.
   * The snapshot contains active queued resource load roots and direct queue
   * tasks. A captured resource root includes every CPU-work descendant it
   * enqueues later, while unrelated roots/tasks submitted after the call do
   * not postpone this fence. Shared-source joins do not merge distinct roots.
   *
   * Failure and queued cancellation count as terminal settlement: callers
   * observe those errors through the original operation promises, while this
   * method resolves after every captured promise settles. By default it pumps
   * background and main queues directly, so waiting never triggers automatic
   * retention sweeps. Paused queues remain paused. With `pump: false`, an
   * external driver must resume/pump queues or the returned promise may remain
   * pending.
   *
   * A standalone canonical `PrepareResourceObjectQueued()` call opens a
   * resource root. Direct `LoadResourceObject()`, direct
   * `PrepareResourceObject()`, standalone `ReadResource()`, and standalone
   * `ReadFormatOnce()` calls bypass the two queues and are not resource roots
   * unless they also own a captured queue task. `WaitUrgent()` remains absent
   * until per-item priority and urgent membership exist.
   *
   * @param {CjsResManWaitOptions} [options={}] Snapshot pumping and cooperative-yield controls.
   * @returns {Promise<CjsResMan>} This manager after all captured work settles.
   * @throws {TypeError} If options, `pump`, or `yield` are invalid.
   * @throws {Error} If a queue pump or custom yield callback itself fails.
   */
  async Wait(options = {}) {
    if (!options || typeof options !== "object" || Array.isArray(options)) {
      throw new TypeError("CjsResMan.Wait options must be an object.");
    }
    if (options.pump !== undefined && typeof options.pump !== "boolean") {
      throw new TypeError("CjsResMan.Wait pump must be a boolean when supplied.");
    }
    if (options.yield !== undefined && typeof options.yield !== "function") {
      throw new TypeError("CjsResMan.Wait yield must be a function when supplied.");
    }
    const snapshot = new Set([...this.#resourceOperations.values(), ...this.#queueOperations.values()]);
    if (snapshot.size === 0) return this;
    const fence = Promise.allSettled([...snapshot]);
    if (options.pump === false) {
      await fence;
      return this;
    }
    const yieldQueue = options.yield || defaultQueueYield;
    let settled = false;
    fence.then(() => {
      settled = true;
    });
    while (!settled) {
      this.PumpBackgroundQueue(options.background || {});
      this.PumpMainThreadQueue(options.prepare || {});
      if (!settled) await Promise.race([fence, Promise.resolve().then(yieldQueue)]);
    }
    await fence;
    return this;
  }

  /**
   * Returns the execution queue selected by its public lane name for the
   * resource manager.
   */
  GetWorkQueue(queue) {
    return CjsResManWorkQueue.normalizeName(queue) === CjsResManQueue.MAIN ? this._prepareQueue : this._loadQueue;
  }

  /**
   * Add one low-level task to a manager queue and retain its promise only while
   * pending so a contemporaneous {@link CjsResMan#Wait} snapshot can include
   * it. This does not assign resource lineage to tasks the callback may submit
   * later; callers should return/await such work or use a manager resource
   * operation.
   *
   * @param {string} queue Queue name or compatibility alias.
   * @param {Function} callback Queue callback receiving immutable task metadata.
   * @param {*} [context=null] `this` value used to invoke the callback.
   * @param {object|null} [metadata=null] Opaque diagnostics retained on the task.
   * @returns {object} Queue task record containing id, queue, state, metadata, and promise.
   * @throws {TypeError} If the queue or callback is invalid.
   */
  QueueTask(queue, callback, context = null, metadata = null) {
    return this.#TrackQueueTask(this.GetWorkQueue(queue).Add(callback, context, metadata));
  }

  /** Requests a later background-queue scheduling pass for the resource manager. */
  ScheduleBackgroundQueue() {
    if (this._backgroundPumpScheduled || this._loadQueue.IsPaused()) return this;
    this._backgroundPumpScheduled = true;
    Promise.resolve().then(() => {
      this._backgroundPumpScheduled = false;
      this.PumpBackgroundQueue();
    });
    return this;
  }

  /**
   * Requests a later main-thread preparation scheduling pass for the resource
   * manager.
   */
  ScheduleMainThreadQueue() {
    if (!this.autoPumpMainThreadQueue || this._mainThreadPumpScheduled || this._prepareQueue.IsPaused()) return this;
    this._mainThreadPumpScheduled = true;
    try {
      this.queueScheduler(() => {
        this._mainThreadPumpScheduled = false;
        this.PumpMainThreadQueue();
      });
    } catch (error) {
      this._mainThreadPumpScheduled = false;
      throw error;
    }
    return this;
  }

  /**
   * Register a resource constructor or factory for one semantic outcome.
   * The constructor is selected by `requirement`/`payload`, never by file
   * extension. It does not enter resource identity: re-registration affects a
   * path/output only after its existing handle is explicitly deleted/cleared.
   *
   * @param {string|Function} requirement Semantic outcome key, or a constructor declaring its own `payload`.
   * @param {Function|object|null} [Constructor=null] Resource constructor/factory, or options when the first argument is the constructor.
   * @param {object} [options={}] Registration aliases and optional requirement/payload override.
   * @param {readonly string[]} [options.aliases=[]] Additional semantic keys mapped to the same constructor.
   * @returns {CjsResMan} This resource manager.
   * @throws {TypeError} If the semantic key or constructor/factory is invalid.
   */
  RegisterResourceType(requirement, Constructor = null, options = {}) {
    if (typeof requirement === "function") {
      options = Constructor && typeof Constructor === "object" ? Constructor : {};
      Constructor = requirement;
      requirement = options.requirement || options.payload || Constructor.payload;
    }
    const key = normalizeRequirement(requirement);
    if (!key) throw new TypeError("CjsResMan.RegisterResourceType requires a semantic requirement.");
    if (typeof Constructor !== "function") {
      throw new TypeError("CjsResMan.RegisterResourceType requires a constructor or factory.");
    }
    this.resourceTypes.set(key, Constructor);
    for (const alias of options.aliases || []) {
      const aliasKey = normalizeRequirement(alias);
      if (aliasKey) this.resourceTypes.set(aliasKey, Constructor);
    }
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
   * @returns {CjsResMan} This resource manager.
   * @throws {TypeError} If the extension or loader is invalid.
   */
  RegisterObjectLoader(ext, loader) {
    const key = normalizeResourceExtension(ext);
    if (!key) throw new TypeError("CjsResMan.RegisterObjectLoader requires an extension.");
    if (typeof loader !== "function") throw new TypeError("CjsResMan.RegisterObjectLoader requires a loader function.");
    this.objectLoaders.set(key, loader);
    return this;
  }

  /**
   * Register a reusable format facade for each accepted input extension.
   * Multiple candidates may share an extension and are resolved by requested
   * output/media type or by their support probes. Defaults are copied into a
   * deeply frozen plain-object/array snapshot so later caller mutation cannot
   * rewrite the registered configuration. Format methods are read from the
   * currently registered facade when an operation runs.
   *
   * @param {Function} Format Format facade declaring at least one `inputTypes` extension.
   * @param {object} [defaults={}] Plain reader-option defaults to snapshot for this registration.
   * @returns {CjsResMan} This resource manager.
   * @throws {TypeError} If the format declaration or immutable defaults snapshot is invalid.
   */
  RegisterFormat(Format, defaults = {}) {
    if (typeof Format !== "function") {
      throw new TypeError("CjsResMan.RegisterFormat requires a format class.");
    }
    if (!Array.isArray(Format.inputTypes) || Format.inputTypes.length === 0) {
      throw new TypeError(`${Format.name || "Format"} must declare non-empty inputTypes.`);
    }
    const descriptor = createFormatDescriptor(Format, defaults);
    for (const inputType of Format.inputTypes) {
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
   * @param {string} extension Input extension with or without a leading dot.
   * @param {Function} Handler CjsResource-compatible handler constructor.
   * @param {Function|Function[]|object} [formatOrFormatsOrOptions={}] Reader and optional target configuration.
   * @returns {CjsResMan} This resource manager.
   * @throws {TypeError} If the extension, handler, formats, or target policy is invalid.
   */
  RegisterExtension(extension, Handler, formatOrFormatsOrOptions = {}) {
    const ext = normalizeResourceExtension(extension);
    if (!ext) {
      throw new TypeError("CjsResMan.RegisterExtension requires an extension.");
    }
    if (typeof Handler !== "function" || typeof Handler.prototype?.Initialize !== "function") {
      throw new TypeError("CjsResMan.RegisterExtension requires a CjsResource-compatible handler constructor.");
    }
    const handlerMode = Handler.handlerMode;
    if (!Object.values(ResourceHandlerMode).includes(handlerMode)) {
      throw new TypeError("CjsResMan.RegisterExtension Handler.handlerMode must be ResourceHandlerMode.RESOURCE or ResourceHandlerMode.OBJECT.");
    }
    const options = normalizeExtensionRouteOptions(formatOrFormatsOrOptions);
    const hasFormat = options.Format !== undefined || options.format !== undefined;
    const hasFormats = options.Formats !== undefined || options.formats !== undefined;
    if (hasFormat && hasFormats) {
      throw new TypeError("CjsResMan.RegisterExtension accepts either Format or Formats, not both.");
    }
    const Target = options.Target || options.target || null;
    const Identify = options.Identify || options.identify || null;
    if (Target && Identify) {
      throw new TypeError("CjsResMan.RegisterExtension accepts either Target or Identify, not both.");
    }
    if ((Target || Identify) && handlerMode !== ResourceHandlerMode.OBJECT) {
      throw new TypeError("CjsResMan extension Target and Identify are valid only for object handlers.");
    }
    if (Target) assertExtensionTarget(Target, "Target");
    if (Identify && typeof Identify !== "function") {
      throw new TypeError("CjsResMan extension Identify must be a function.");
    }
    const explicitFormats = hasFormat ? [options.Format || options.format] : hasFormats ? options.Formats || options.formats : null;
    if (explicitFormats !== null && !Array.isArray(explicitFormats)) {
      throw new TypeError("CjsResMan extension Formats must be an array.");
    }
    const loader = explicitFormats === null ? this.GetObjectLoader(ext) : null;
    const formats = explicitFormats === null ? loader ? [] : this.GetFormatDescriptors(ext) : explicitFormats.map((entry, index) => createExtensionFormatDescriptor(entry, options.defaults || {}, `Formats[${index}]`));
    if (!loader && formats.length === 0) {
      throw new TypeError(`CjsResMan extension .${ext} requires a Format, Formats, or registered reader.`);
    }
    validateOrderedExtensionFormats(formats, ext);
    const route = Object.freeze({
      extension: ext,
      Handler,
      handlerMode,
      loader,
      formats: Object.freeze([...formats]),
      Target,
      Identify
    });
    this.#extensionRoutes.set(ext, route);
    return this;
  }

  /**
   * Return the current immutable explicit route for one extension.
   *
   * @param {string} extension Input extension with or without a leading dot.
   * @returns {object|null} Captured route descriptor, or `null`.
   */
  GetExtensionRoute(extension) {
    return this.#extensionRoutes.get(normalizeResourceExtension(extension)) || null;
  }

  /**
   * Return registered format facades for one normalized input extension.
   *
   * @param {string} inputType Input extension with or without a leading dot.
   * @returns {Function[]} Detached format-class list in registration order.
   */
  GetFormats(inputType) {
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
  ResolveFormat(inputType, options = {}) {
    return this.ResolveFormatDescriptor(inputType, options).Format;
  }

  /**
   * Return the immediate canonical resource handle for a source path and
   * promised output. Cache hits explicitly renew MotherLode activity. When
   * `reload: true` finds an existing owner, this synchronous method returns a
   * distinct off-registry candidate and leaves the canonical handle untouched.
   * Calling `Ready()` on that candidate, or using `ReloadResource()` /
   * `ReloadObject()`, prepares it and conditionally commits it through the
   * asynchronous atomic-reload contract.
   *
   * @param {string} path Carbon-style source resource path.
   * @param {object} [options={}] Promised output, semantic resource, source provenance, and reload settings.
   * @returns {CjsResource} Canonical handle, or an off-registry reload candidate.
   * @throws {TypeError} If the path, identity settings, or resource constructor are invalid.
   * @throws {Error} If MotherLode is inactive or displaced-resource cleanup fails.
   */
  GetResource(path, options = {}) {
    if (!options || typeof options !== "object" || Array.isArray(options)) {
      throw new TypeError("CjsResMan.GetResource options must be an object.");
    }
    const key = normalizeResourcePath(path);
    const variant = this.GetResourceVariant(options);
    const ext = normalizeResourceExtension(options.ext || getResourceExtension(key));
    const cacheKey = getMotherLodeKey(key, variant);
    const existing = this.motherLode.Lookup(cacheKey);
    const extensionRoute = existing ? this.#resourceExtensionRoutes.get(existing) || null : this.GetExtensionRoute(ext);
    if (options.emit !== undefined) {
      const objectLoader = extensionRoute?.loader || !extensionRoute && this.GetObjectLoader(ext);
      if (objectLoader) {
        throw createObjectLoaderOutputMissingError(ext, options.emit);
      } else {
        const descriptors = extensionRoute ? extensionRoute.formats : this.GetFormatDescriptors(ext);
        const candidates = filterFormatDescriptors(descriptors, options);
        if (descriptors.length > 0 && candidates.length === 0) {
          throw createFormatOutputMissingError(ext, options.emit, descriptors);
        }
      }
    }
    if (existing && options.reload !== true) {
      this.#BindResourceLifecycle(cacheKey, existing);
      this.motherLode.KeepAlive?.(cacheKey);
      return existing;
    }
    if (!existing && options.reload === true) {
      this.InvalidateReadCache(key, {
        source: options.source || this.source
      });
    }
    const Constructor = this.ResolveResourceConstructor(options, extensionRoute);
    const resource = this.CreateResource(Constructor, key, ext, options, existing && options.reload === true ? existing : null, extensionRoute);
    if (existing && options.reload === true) {
      this.#BindResourceLifecycle(cacheKey, existing);
      this.motherLode.KeepAlive?.(cacheKey);
      const expectedOwnership = this.#RequireResourceOwnership(existing, "reload-candidate:create");
      const generation = this.#nextResourceReloadGeneration++;
      const loaderOptions = Object.freeze(getResourceLoaderOptions(options, options.source || this.source));
      const candidate = Object.freeze({
        reloadCandidate: true,
        generation,
        owner: this.motherLode,
        key: cacheKey,
        expected: existing,
        expectedOwnership,
        resource,
        loaderOptions
      });
      this.#reloadCandidates.set(resource, candidate);
      this.#reloadGenerations.set(cacheKey, generation);
      if (typeof resource.SetObjectLoader === "function") {
        const reloadOptions = {
          ...loaderOptions,
          reload: true
        };
        resource.SetObjectLoader(loadOptions => this.#GetReloadCandidateObject(resource, {
          ...mergeResourceLoaderOptions(reloadOptions, loadOptions),
          reload: true
        }), reloadOptions);
      }
      return resource;
    }
    const insertion = this.motherLode.Insert(cacheKey, resource, {
      replace: true
    });
    const canonical = insertion?.resource || resource;
    if (insertion?.displaced && insertion.displaced !== canonical) {
      this.#InvalidateResourceOwnership(insertion.displaced);
    } else if (existing && existing !== canonical && this.motherLode.Lookup(cacheKey) !== existing) {
      this.#InvalidateResourceOwnership(existing);
    }
    this.#BindResourceLifecycle(cacheKey, canonical);
    this.motherLode.KeepAlive?.(cacheKey);
    return canonical;
  }

  /**
   * Resolve one object outcome for a canonical resource identity. Concurrent
   * callers share only the active operation. Once settled, a resident payload
   * is returned without rereading source data and its explicit payload lease is
   * renewed. If the payload was released, calling this method explicitly starts
   * reconstruction; liveness queries and purge operations never do so.
   * `sourceRevision` selects read-cache provenance but does not replace a
   * resident payload by itself—use one-shot `reload: true` for replacement.
   *
   * @param {string} path Carbon-style source resource path.
   * @param {object} [options={}] Identity, source, format, loader, and queue options.
   * @returns {Promise<*>} In-flight, resident, or reconstructed object outcome.
   * @throws {TypeError|Error} If path, identity, source, format, or conversion configuration is invalid.
   */
  GetObject(path, options = {}) {
    const resource = this.GetResource(path, options);
    const operationOptions = mergeResourceLoaderOptions(resource.GetObjectRequest?.() || {}, options);
    if (this.#reloadCandidates.has(resource)) {
      return this.#GetReloadCandidateObject(resource, operationOptions);
    }
    const ownership = this.#RequireResourceOwnership(resource, "object:begin");
    const existing = this.objectOperations.get(resource);
    if (existing?.ownership === ownership) {
      return existing.promise;
    }
    if (resource.HasPayload?.()) {
      resource.KeepPayloadAlive?.();
      return Promise.resolve(getPublishedResourceObject(resource, this.#resourceExtensionRoutes.get(resource) || null, this.#resourceHandlerModes.get(resource) || null));
    }
    const promise = this.QueueResourceObject(resource, operationOptions);
    const operation = {
      promise,
      ownership
    };
    this.objectOperations.set(resource, operation);
    promise.then(() => {
      if (this.objectOperations.get(resource) === operation) {
        this.objectOperations.delete(resource);
      }
    }, () => {
      if (this.objectOperations.get(resource) === operation) {
        this.objectOperations.delete(resource);
      }
    });
    return promise;
  }

  /**
   * Loads and hydrates an object graph through the configured resource pipeline
   * for the resource manager.
   */
  LoadObject(path, options = {}) {
    return this.GetObject(path, options);
  }

  /**
   * Fetches and hydrates an object graph without retaining a resource handle for
   * the resource manager.
   */
  FetchObject(path, options = {}) {
    return this.GetObject(path, options);
  }

  /**
   * Read and atomically publish a distinct replacement object while the
   * former canonical resource remains available. This is the explicit form of
   * `GetObject(path, { reload: true })`.
   *
   * @param {string} path Carbon-style source resource path.
   * @param {object} [options={}] Identity, source, format, and queue settings.
   * @returns {Promise<*>} Published CPU object outcome from the committed candidate.
   * @throws {TypeError|Error|AggregateError} If candidate creation, conversion, conditional publication, or cleanup fails.
   */
  ReloadObject(path, options = {}) {
    if (!options || typeof options !== "object" || Array.isArray(options)) {
      throw new TypeError("CjsResMan.ReloadObject options must be an object.");
    }
    return this.GetObject(path, {
      ...options,
      reload: true
    });
  }

  /**
   * Resolve and load one canonical resource handle. One-shot reload creates
   * a distinct candidate, keeps the former good handle canonical through every
   * asynchronous CPU operation, and returns only after an exact-owner conditional
   * publication succeeds. Readiness receives `reload: false` because the
   * candidate's private loader owns the one-shot freshness request.
   *
   * @param {string} path Carbon-style source resource path.
   * @param {object} [options={}] Resource identity, source provenance, reload, format, and queue options.
   * @returns {Promise<CjsResource>} Loaded canonical resource selected by this operation.
   * @throws {TypeError|Error} If identity, source, format, conversion, or cleanup fails.
   */
  async FetchResource(path, options = {}) {
    const resource = this.GetResource(path, options);
    const readinessOptions = options.reload === true ? {
      ...options,
      reload: false
    } : options;
    await resource.Ready(readinessOptions);
    return resource;
  }

  /**
   * Load and atomically publish a distinct replacement resource while the
   * former canonical handle remains available. This is the explicit form of
   * `FetchResource(path, { reload: true })`.
   *
   * @param {string} path Carbon-style source resource path.
   * @param {object} [options={}] Identity, source, format, and queue settings.
   * @returns {Promise<CjsResource>} Fully loaded committed replacement.
   * @throws {TypeError|Error|AggregateError} If candidate creation, conversion, conditional publication, or cleanup fails.
   */
  ReloadResource(path, options = {}) {
    if (!options || typeof options !== "object" || Array.isArray(options)) {
      throw new TypeError("CjsResMan.ReloadResource options must be an object.");
    }
    return this.FetchResource(path, {
      ...options,
      reload: true
    });
  }

  /**
   * Run or join one off-registry candidate operation. The returned promise
   * resolves only after exact-owner publication and displaced-owner cleanup
   * both succeed. A committed cleanup failure rejects with the new candidate
   * still canonical and attached on the MotherLode error result.
   *
   * @param {object|Function} resource Candidate resource returned by `GetResource`.
   * @param {object} options Reload source, format, and queue options.
   * @returns {Promise<*>} Candidate object outcome after conditional publication.
   */
  #GetReloadCandidateObject(resource, options) {
    const candidate = this.#reloadCandidates.get(resource) || null;
    if (!candidate) {
      return Promise.reject(reloadCandidateUnavailableError(resource));
    }
    const existing = this.#reloadOperations.get(resource);
    if (existing?.candidate === candidate) return existing.promise;
    const operation = {
      candidate,
      promise: this.#RunReloadCandidate(candidate, options)
    };
    this.#reloadOperations.set(resource, operation);
    operation.promise.then(() => {
      if (this.#reloadOperations.get(resource) === operation) {
        this.#reloadOperations.delete(resource);
      }
    }, () => {
      if (this.#reloadOperations.get(resource) === operation) {
        this.#reloadOperations.delete(resource);
      }
    });
    return operation.promise;
  }

  /**
   * Queue source/read/publication work against a detached candidate, then commit
   * it only if its former exact owner and newest-request token remain current.
   * Candidate work is a normal queued root visible to `Wait()` and holds one
   * purge lock on the former good owner until settlement.
   *
   * @param {CjsResourceReloadCandidate} candidate Immutable candidate authority.
   * @param {object} options Reload source, format, queue, and prepare options.
   * @returns {Promise<*>} Published object outcome after a successful commit.
   */
  async #RunReloadCandidate(candidate, options) {
    let committed = false;
    let releaseLock = noop;
    const finishOperation = this.#BeginResourceOperation(true);
    try {
      this.#AssertReloadCandidate(candidate, "reload:begin");
      releaseLock = this.#AcquireResourcePurgeLock(candidate.expectedOwnership);
      const read = this.#BeginReadOperation(candidate.resource.GetPath(), {
        ...options,
        reload: true
      });
      this.#AssertReloadCandidate(candidate, "reload:requested");
      candidate.resource.error = null;
      candidate.resource.MarkRequested();
      this.#AssertReloadCandidate(candidate, "reload:requested-settled");
      const bytes = await this.#QueueReadResource(read.context, read.options);
      this.#AssertReloadCandidate(candidate, "reload:loading");
      candidate.resource.MarkLoading();
      this.#AssertReloadCandidate(candidate, "reload:loading-settled");
      const object = await this.#PrepareResourceObjectQueued(candidate.resource, bytes, read.options, candidate);
      this.#AssertReloadCandidate(candidate, "reload:commit");
      try {
        const result = candidate.owner.ReplaceExpected(candidate.key, candidate.expected, candidate.resource, {
          commitGuard: () => this.#IsReloadCandidateCurrent(candidate)
        });
        if (!result.committed) {
          throw staleReloadCandidateError(candidate, "reload:commit-compare");
        }
        committed = true;
        this.#FinalizeCommittedReload(candidate);
      } catch (error) {
        if (error?.code === "CJS_MOTHERLODE_REPLACE_CLEANUP_FAILED" && error.result?.committed === true && error.result.resource === candidate.resource) {
          committed = true;
          try {
            this.#FinalizeCommittedReload(candidate);
          } catch (finalizeError) {
            const combined = new AggregateError([error, finalizeError], `CjsResMan reload committed with cleanup and finalization failures for ${candidate.key}.`);
            combined.code = "CJS_RESMAN_RELOAD_COMMIT_FAILED";
            combined.committed = true;
            combined.resource = candidate.resource;
            combined.result = error.result;
            throw combined;
          }
        }
        throw error;
      }
      return object;
    } catch (error) {
      if (!committed) {
        throw this.#CreateReloadCandidateFailure(candidate, error);
      }
      throw error;
    } finally {
      releaseLock();
      finishOperation();
      if (this.#reloadGenerations.get(candidate.key) === candidate.generation) {
        this.#reloadGenerations.delete(candidate.key);
      }
    }
  }

  /**
   * Bind a successfully committed candidate and invalidate only the displaced
   * handle's former publication generation. The resource loader is restored
   * to ordinary canonical reconstruction behavior.
   *
   * @param {CjsResourceReloadCandidate} candidate Committed candidate authority.
   * @returns {void}
   */
  #FinalizeCommittedReload(candidate) {
    this.#InvalidateResourceOwnership(candidate.expected);
    this.#reloadCandidates.delete(candidate.resource);
    const errors = [];
    try {
      if (typeof candidate.resource.SetObjectLoader === "function") {
        candidate.resource.SetObjectLoader(loadOptions => this.GetObject(candidate.resource.GetPath(), mergeResourceLoaderOptions(candidate.loaderOptions, loadOptions)), candidate.loaderOptions);
      }
    } catch (error) {
      errors.push(error);
    }
    try {
      this.#BindResourceLifecycle(candidate.key, candidate.resource);
    } catch (error) {
      errors.push(error);
    }
    try {
      candidate.owner.KeepAlive?.(candidate.key);
    } catch (error) {
      errors.push(error);
    }
    if (errors.length) {
      const error = new AggregateError(errors, `CjsResMan committed reload finalization failed for ${candidate.key}.`);
      error.code = "CJS_RESMAN_RELOAD_COMMIT_FINALIZE_FAILED";
      error.committed = true;
      error.resource = candidate.resource;
      throw error;
    }
  }

  /**
   * Mark and clean a failed or stale detached candidate. The original
   * load/prepare/stale error remains the rejection when cleanup succeeds;
   * state-publication or cleanup errors are aggregated without touching the
   * preserved canonical owner.
   *
   * @param {CjsResourceReloadCandidate} candidate Failed candidate authority.
   * @param {*} cause Original operation failure.
   * @returns {*} Original error or a contextual AggregateError.
   */
  #CreateReloadCandidateFailure(candidate, cause) {
    const errors = [cause];
    try {
      candidate.resource.SetError?.(cause);
    } catch (error) {
      errors.push(error);
    }
    try {
      this.#CleanupReloadCandidate(candidate.resource);
    } catch (error) {
      errors.push(error);
    }
    if (errors.length === 1) return cause;
    const error = new AggregateError(errors, `CjsResMan reload candidate cleanup failed for ${candidate.key}.`);
    error.code = "CJS_RESMAN_RELOAD_CANDIDATE_CLEANUP_FAILED";
    error.resource = candidate.resource;
    error.cause = cause;
    return error;
  }

  /**
   * Release adapter and CPU-payload ownership accumulated by an off-registry
   * candidate. This cleanup is idempotent for CjsResource-compatible handles
   * and never marks the never-canonical candidate `PURGED`.
   *
   * @param {object|Function} resource Detached reload candidate.
   * @returns {void}
   * @throws {AggregateError} If adapter destruction, payload release, or lifecycle detachment fails.
   */
  #CleanupReloadCandidate(resource) {
    const errors = [];
    try {
      resource.DestroyAdapterResources?.({
        destroy: true
      });
    } catch (error) {
      errors.push(error);
    }
    try {
      resource.ReleasePayload?.();
    } catch (error) {
      errors.push(error);
    }
    try {
      resource.SetLifecycleController?.(null);
    } catch (error) {
      errors.push(error);
    }
    if (errors.length) {
      throw new AggregateError(errors, "CjsResMan reload candidate ownership cleanup failed.");
    }
  }

  /**
   * Fetches raw source bytes through the configured resource source for the
   * resource manager.
   */
  Fetch(path, options = {}) {
    if (options.resource === true || options.requirement !== undefined || options.payload !== undefined) {
      return this.FetchResource(path, options);
    }
    const normalizedPath = normalizeResourcePath(path);
    const variant = this.GetResourceVariant(options);
    const cacheKey = getMotherLodeKey(normalizedPath, variant);
    const existing = this.motherLode.Lookup(cacheKey);
    const ext = normalizeResourceExtension(options.ext || getResourceExtension(normalizedPath));
    const route = existing ? this.#resourceExtensionRoutes.get(existing) || null : this.GetExtensionRoute(ext);
    return route?.handlerMode === ResourceHandlerMode.RESOURCE ? this.FetchResource(path, options) : this.FetchObject(path, options);
  }

  /**
   * Read and prepare an existing resource immediately, outside the manager
   * queues. One balanced purge lock protects the canonical handle for the
   * complete asynchronous operation; any caller-owned locks remain intact.
   * Failure is published to the resource before rejection only while its
   * captured ownership generation remains canonical. A detached operation
   * preserves its original failure without changing the old handle.
   *
   * @param {CjsResource} resource Existing manager-bound resource handle.
   * @param {object} [options={}] Source, format, semantic outcome, and queue options.
   * @returns {Promise<*>} Prepared object, or the semantic resource when it owns the payload.
   * @throws {TypeError|Error} If the resource, source, format, options, or canonical ownership are invalid.
   */
  async LoadResourceObject(resource, options = {}) {
    const read = this.#BeginReadOperation(resource.GetPath(), options);
    const ownership = this.#RequireResourceOwnership(resource, "direct-load:begin");
    const releaseLock = this.#AcquireResourcePurgeLock(ownership);
    const finishOperation = this.#BeginResourceOperation(false);
    try {
      this.#AssertResourceOwnership(ownership, "direct-load:loading");
      resource.error = null;
      resource.MarkLoading();
      this.#AssertResourceOwnership(ownership, "direct-load:loading-settled");
      const bytes = await this.#ReadResource(read.context, read.options);
      this.#AssertResourceOwnership(ownership, "direct-load:source-settled");
      return await this.#PrepareResourceObject(resource, bytes, read.options, ownership);
    } catch (error) {
      if (this.#IsResourceOwnershipCurrent(ownership)) resource.SetError(error);
      throw error;
    } finally {
      releaseLock();
      finishOperation();
    }
  }

  /**
   * Queue a source read followed by CPU conversion and publication. One balanced
   * purge lock is acquired before request publication and released only after
   * success or failure, preventing inactivity sweeps from detaching an active
   * handle. The lock does not reload data and does not consume caller locks.
   *
   * @param {CjsResource} resource Existing manager-bound resource handle.
   * @param {object} [options={}] Source, format, queue, and semantic outcome options.
   * @returns {Promise<*>} Promise for the loaded object or semantic resource.
   * @throws {TypeError} If the resource cannot be queued or its options are invalid.
   */
  QueueResourceObject(resource, options = {}) {
    const read = this.#BeginReadOperation(resource.GetPath(), options);
    const ownership = this.#RequireResourceOwnership(resource, "queue:begin");
    const releaseLock = this.#AcquireResourcePurgeLock(ownership);
    const finishOperation = this.#BeginResourceOperation(true);
    let load;
    try {
      this.#AssertResourceOwnership(ownership, "queue:requested");
      resource.error = null;
      resource.MarkRequested();
      this.#AssertResourceOwnership(ownership, "queue:requested-settled");
      load = this.#QueueReadResource(read.context, read.options);
    } catch (error) {
      releaseLock();
      finishOperation();
      throw error;
    }
    const operation = load.then(bytes => {
      this.#AssertResourceOwnership(ownership, "queue:loading");
      resource.MarkLoading();
      this.#AssertResourceOwnership(ownership, "queue:loading-settled");
      return this.#PrepareResourceObjectQueued(resource, bytes, read.options, ownership);
    }).catch(error => {
      if (this.#IsResourceOwnershipCurrent(ownership)) resource.SetError(error);
      throw error;
    }).finally(releaseLock);
    operation.then(finishOperation, finishOperation);
    return operation;
  }

  /**
   * Queue one source read under the selected source/path/revision identity.
   * Cache policy is tri-state: omitted shares an in-flight or explicitly
   * retained record, `true` additionally retains success, and `false` bypasses
   * both sharing and retention. `reload: true` invalidates this source/path
   * before the new task and does not cancel detached existing consumers.
   *
   * @param {string} path Carbon-style source resource path.
   * @param {CjsResManReadCacheOptions} [options={}] Source, revision, reload, and cache controls forwarded to the read.
   * @returns {Promise<*>} Promise for source bytes or source-compatible data.
   * @throws {TypeError} If path, source, revision, or options are invalid.
   */
  QueueReadResource(path, options = {}) {
    const read = this.#BeginReadOperation(path, options);
    return this.#QueueReadResource(read.context, read.options);
  }

  /**
   * Immediately read, transform, and publish one resource payload outside the
   * manager queues. Canonical resources capture their current ownership
   * generation and cannot publish after deletion, clearing, or replacement;
   * historically supported detached resource-like objects remain usable
   * without manager ownership guards.
   *
   * @param {object|Function} resource Resource receiving the final payload.
   * @param {*} bytes Source bytes or reader-compatible source data.
   * @param {object} [options={}] Format and semantic outcome options.
   * @returns {Promise<*>} Final plain payload or semantic resource handle.
   * @throws {Error} If reading/preparation fails or canonical ownership becomes stale.
   */
  async PrepareResourceObject(resource, bytes, options = {}) {
    const ownership = this.#GetResourceOwnership(resource, "direct-prepare:begin");
    if (!ownership) {
      return this.#PrepareResourceObject(resource, bytes, options, null);
    }
    const releaseLock = this.#AcquireResourcePurgeLock(ownership);
    const finishOperation = this.#BeginResourceOperation(false);
    try {
      return await this.#PrepareResourceObject(resource, bytes, options, ownership);
    } finally {
      releaseLock();
      finishOperation();
    }
  }

  /**
   * Queue one reader/format conversion and then CPU publication on the main
   * manager queue. A canonical standalone call becomes a queued resource root
   * for `Wait()` and retains one balanced purge lock through settlement.
   * The read and publication items validate the captured canonical generation
   * before dispatch and after asynchronous settlement.
   *
   * @param {object|Function} resource Resource receiving the final payload.
   * @param {*} bytes Source bytes or reader-compatible source data.
   * @param {object} [options={}] Format and semantic outcome options.
   * @returns {Promise<*>} Final plain payload or semantic resource handle.
   * @throws {Error} If queueing/preparation fails or canonical ownership becomes stale.
   */
  async PrepareResourceObjectQueued(resource, bytes, options = {}) {
    const ownership = this.#GetResourceOwnership(resource, "queued-prepare:begin");
    if (!ownership) {
      return this.#PrepareResourceObjectQueued(resource, bytes, options, null);
    }
    const releaseLock = this.#AcquireResourcePurgeLock(ownership);
    const finishOperation = this.#BeginResourceOperation(true);
    try {
      return await this.#PrepareResourceObjectQueued(resource, bytes, options, ownership);
    } finally {
      releaseLock();
      finishOperation();
    }
  }

  /**
   * Read and immediately publish one CPU payload with optional hidden
   * ownership authority. Format classes own every requested conversion;
   * backend realization runs separately after this CPU publication.
   *
   * @param {object|Function} resource Resource receiving the final payload.
   * @param {*} bytes Source bytes or reader-compatible source data.
   * @param {object} options Resolved prepare options.
   * @param {CjsResourceMutationAuthority|null} ownership Captured canonical or reload-candidate authority.
   * @returns {Promise<*>} Final plain payload or semantic resource handle.
   */
  async #PrepareResourceObject(resource, bytes, options, ownership) {
    this.#AssertOptionalResourceOwnership(ownership, "prepare:read");
    const resolved = this.#ResolveResourceObjectRead(resource, bytes, options);
    const decoded = await this.#ReadResolvedResourceObjectPayload(resource, bytes, options, resolved);
    const object = this.#HydrateExtensionObject(resource, decoded, options, resolved);
    this.#AssertOptionalResourceOwnership(ownership, "prepare:read-settled");
    return this.#PublishResourceObject(ownership, resource, object, options);
  }

  /**
   * Queue one main-thread reader/format operation followed by guarded CPU
   * publication. Both remain distinct budgeted queue items under one resource
   * root so `Wait()` continues to fence dynamically enqueued publication.
   *
   * @param {object|Function} resource Resource receiving the final payload.
   * @param {*} bytes Source bytes or reader-compatible source data.
   * @param {object} options Resolved prepare options.
   * @param {CjsResourceMutationAuthority|null} ownership Captured canonical or reload-candidate authority.
   * @returns {Promise<*>} Final plain payload or semantic resource handle.
   */
  async #PrepareResourceObjectQueued(resource, bytes, options, ownership) {
    let object = bytes;
    const resolved = this.#ResolveResourceObjectRead(resource, bytes, options);
    const formatOptions = resolved.descriptor ? createFormatReadOptions(resolved.descriptor, options) : null;
    const formatContext = resolved.descriptor ? createResourcePathContext(resource.GetPath(), READ_CONTEXTS.get(options)) : null;
    const runInWorker = Boolean(resolved.descriptor && typeof this.resourceLoader?.CanReadFormat === "function" && this.resourceLoader.CanReadFormat(resolved.descriptor, formatOptions, formatContext));
    let read;
    if (runInWorker) {
      this.#AssertOptionalResourceOwnership(ownership, "worker-stage:read:run");
      read = await this.#ReadResolvedResourceObjectPayload(resource, bytes, options, resolved);
    } else {
      this.#AssertOptionalResourceOwnership(ownership, "queue-stage:read:enqueue");
      const readTask = this.QueueTask(CjsResManQueue.MAIN, () => {
        this.#AssertOptionalResourceOwnership(ownership, "queue-stage:read:run");
        return this.#ReadResolvedResourceObjectPayload(resource, bytes, options, resolved);
      }, resource, {
        kind: "prepare",
        stage: "read",
        path: resource.GetPath()
      });
      read = await readTask.promise;
    }
    this.#AssertOptionalResourceOwnership(ownership, "queue-stage:read:settled");
    if (read !== undefined) object = read;
    this.#AssertOptionalResourceOwnership(ownership, "queue-stage:publish:enqueue");
    const publishTask = this.QueueTask(CjsResManQueue.MAIN, () => {
      this.#AssertOptionalResourceOwnership(ownership, "queue-stage:publish:run");
      const hydrated = this.#HydrateExtensionObject(resource, object, options, resolved);
      return this.#PublishResourceObject(ownership, resource, hydrated, options);
    }, resource, {
      kind: "prepare",
      stage: "publish",
      path: resource.GetPath()
    });
    const published = await publishTask.promise;
    this.#AssertOptionalResourceOwnership(ownership, "queue-stage:publish:settled");
    if (published !== undefined) object = published;
    return object;
  }

  /**
   * Decode source bytes with the currently registered reader for the resource
   * extension. A direct extension loader wins over registered format candidates;
   * byte support probes may disambiguate those candidates.
   *
   * @param {CjsResource} resource Resource whose reader outcome is requested.
   * @param {*} bytes Source byte payload.
   * @param {object} [options={}] Requested output plus per-operation controls.
   * @returns {Promise<*>} Direct-loader or registered-format reader outcome.
   * @throws {Error|TypeError} If no registered reader matches or its read contract fails.
   */
  async ReadResourceObjectPayload(resource, bytes, options = {}) {
    return this.#ReadResolvedResourceObjectPayload(resource, bytes, options, this.#ResolveResourceObjectRead(resource, bytes, options));
  }

  /**
   * Resolve the configured direct loader or format descriptor once so queue
   * selection and execution use the same registration snapshot.
   *
   * @param {CjsResource} resource Resource whose CPU outcome is requested.
   * @param {*} bytes Source input.
   * @param {object} options Requested output options.
   * @returns {{loader: Function|null, descriptor: object|null, route: object|null}} Resolved reader.
   */
  #ResolveResourceObjectRead(resource, bytes, options) {
    const route = this.#resourceExtensionRoutes.get(resource) || null;
    const explicitLoader = route?.loader || !route && this.GetObjectLoader(resource.GetExt());
    if (explicitLoader) {
      if (options.emit !== undefined) {
        throw createObjectLoaderOutputMissingError(resource.GetExt(), options.emit);
      }
      return {
        loader: explicitLoader,
        descriptor: null,
        route
      };
    }
    return {
      loader: null,
      descriptor: route ? resolveOrderedExtensionFormatDescriptor(route.formats, resource.GetExt(), {
        ...options,
        bytes
      }) : this.ResolveFormatDescriptor(resource.GetExt(), {
        ...options,
        bytes
      }),
      route
    };
  }

  /**
   * Execute one already-resolved reader through its direct or format path.
   *
   * @param {CjsResource} resource Resource whose CPU outcome is requested.
   * @param {*} bytes Source input.
   * @param {object} options Requested output options.
   * @param {{loader: Function|null, descriptor: object|null}} resolved Reader selection.
   * @returns {Promise<*>} Reader result.
   */
  #ReadResolvedResourceObjectPayload(resource, bytes, options, resolved) {
    if (resolved.loader) {
      return resolved.loader(bytes, createPrepareContext(this, resource, bytes, options, "read"));
    }
    return this.ReadFormatOnce(resource, resolved.descriptor, bytes, options);
  }

  /**
   * Apply a fixed target or dynamic identification policy after format reading
   * and before payload publication. Worker decoding has settled by this point,
   * so constructors and Identify functions remain on the caller thread.
   *
   * @param {CjsResource} resource Route handler receiving the decoded value.
   * @param {*} values Decoded format result.
   * @param {object} options Request options.
   * @param {{descriptor: object|null, route: object|null}} resolved Captured reader route.
   * @returns {*} Original or hydrated object value.
   */
  #HydrateExtensionObject(resource, values, options, resolved) {
    const route = resolved.route;
    if (!route || !route.Target && !route.Identify) return values;
    const Format = resolved.descriptor?.Format || null;
    const context = Object.freeze({
      ...createResourcePathContext(resource.GetPath(), READ_CONTEXTS.get(options)),
      Format,
      format: Format?.id || Format?.name || "",
      options,
      resMan: this
    });
    let Target = route.Target;
    if (route.Identify) {
      try {
        Target = route.Identify(values, context);
      } catch (error) {
        throw createExtensionTargetError(resource, "Identify threw an error.", error);
      }
      if (Target === true) return values;
      if (Target === false || Target === null || Target === undefined) {
        throw createExtensionTargetError(resource, "Identify did not resolve a target constructor.");
      }
      try {
        assertExtensionTarget(Target, "Identify result");
      } catch (error) {
        throw createExtensionTargetError(resource, "Identify returned an invalid target constructor.", error);
      }
    }
    try {
      const hydrated = typeof Target.fromYAML === "function" ? Target.fromYAML(values, context) : Target.from(values);
      if (hydrated && typeof hydrated.then === "function") {
        throw new TypeError("Extension target hydration must be synchronous.");
      }
      return hydrated;
    } catch (error) {
      throw createExtensionTargetError(resource, "Target hydration failed.", error);
    }
  }

  /**
   * Publish the final CPU object outcome and loaded state. Every
   * CjsResource-compatible handle owns the reader/converter result through
   * `SetPayload`, making CPU payloads visible to MotherLode retention policy.
   * Base resources also expose the payload through the compatibility `object`
   * alias; semantic subclasses continue to return and alias the resource while
   * retaining their validated payload privately.
   *
   * @param {CjsResource} resource Target canonical resource handle.
   * @param {*} object Final reader or format-converter outcome.
   * @param {object} [options={}] Semantic resource validation/publication options.
   * @returns {*} Plain payload for a base resource, or the semantic resource handle.
   * @throws {TypeError|Error} If ownership, semantic payload validation, or loaded-state publication fails.
   */
  PublishResourceObject(resource, object, options = {}) {
    const ownership = this.#GetResourceOwnership(resource, "publish:begin");
    if (!ownership) {
      return this.#PublishResourceObjectValue(resource, object, options);
    }
    const finishOperation = this.#BeginResourceOperation(false);
    try {
      return this.#PublishResourceObject(ownership, resource, object, options);
    } finally {
      finishOperation();
    }
  }

  /**
   * Publish only while the captured resource authority remains canonical.
   * The post-publication check catches synchronous reentrant ownership changes
   * from state listeners before the caller can treat obsolete work as success.
   *
   * @param {CjsResourceMutationAuthority|null} ownership Captured canonical or reload-candidate authority.
   * @param {object|Function} resource Resource receiving the final payload.
   * @param {*} object Final reader/converter outcome.
   * @param {object} options Semantic resource publication options.
   * @returns {*} Plain payload or semantic resource handle.
   */
  #PublishResourceObject(ownership, resource, object, options) {
    this.#AssertOptionalResourceOwnership(ownership, "publish");
    const result = this.#PublishResourceObjectValue(resource, object, options);
    this.#AssertOptionalResourceOwnership(ownership, "publish-settled");
    return result;
  }

  /**
   * Apply the unguarded synchronous payload/state mutation after the caller
   * has established any required canonical authority.
   *
   * @param {object|Function} resource Resource receiving the final payload.
   * @param {*} object Final reader/converter outcome.
   * @param {object} options Semantic resource publication options.
   * @returns {*} Plain payload or semantic resource handle.
   */
  #PublishResourceObjectValue(resource, object, options) {
    const mode = resolveResourceHandlerMode(resource, this.#resourceExtensionRoutes.get(resource) ? this.#resourceHandlerModes.get(resource) : null);
    resource.SetPayload?.(object, options);
    // The two modes differ in one thing only: what `object` names and what the
    // caller is handed back. RESOURCE publishes the stable handle, so both
    // point at the resource; OBJECT publishes the reader outcome.
    const published = mode === ResourceHandlerMode.RESOURCE ? resource : object;
    resource.object = published;
    // PREPARED, not LOADED: `object` is the reader/converter OUTCOME, so the
    // bytes have already been turned into whatever they needed to become.
    // LOADED means raw source data is in hand and still has to be prepared - a
    // resource in that state is not yet good, and marking it here left IsGood()
    // permanently false for every resource that does not prepare itself.
    if (!resource.IsPrepared?.()) resource.MarkPrepared();
    return published;
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
   * extension. Each descriptor contains its facade and frozen defaults.
   *
   * @param {string} inputType Input extension with or without a leading dot.
   * @returns {object[]} Descriptor list in registration order.
   */
  GetFormatDescriptors(inputType) {
    return [...(this.formats.get(normalizeResourceExtension(inputType)) || [])];
  }

  /**
   * Resolve one current format registration descriptor. Output/media filters
   * run first; optional source bytes may then run support probes to disambiguate.
   *
   * @param {string} inputType Input extension with or without a leading dot.
   * @param {object} [options={}] Format, output, media type, and optional byte selectors.
   * @returns {object} Selected immutable registration descriptor.
   * @throws {Error} If no candidate matches or multiple candidates remain.
   */
  ResolveFormatDescriptor(inputType, options = {}) {
    const key = normalizeResourceExtension(inputType);
    const descriptors = this.GetFormatDescriptors(key);
    const candidates = filterFormatDescriptors(descriptors, options);
    if (descriptors.length > 0 && candidates.length === 0 && options.emit !== undefined) {
      throw createFormatOutputMissingError(key, options.emit, descriptors);
    }
    return resolveFormatDescriptorCandidates(candidates, key, options);
  }

  /**
   * Invoke one format descriptor using its frozen registration defaults and
   * the request's explicit format options. Static async/sync readers take
   * precedence over instance `ReadAsync`/`Read` compatibility methods.
   *
   * @param {object} descriptor Selected immutable registration descriptor.
   * @param {*} bytes Source bytes supplied to the format facade.
   * @param {object} [options={}] Output, class, and `formatOptions` overrides.
   * @returns {Promise<*>} Parsed format outcome.
   * @throws {TypeError|Error} If the facade lacks a reader or reading fails.
   * @remarks Resource-backed calls pass normalized path context as the
   * reader's third argument; direct descriptor reads without a resource pass
   * `null`.
   */
  async ReadFormat(descriptor, bytes, options = {}) {
    const readContext = READ_CONTEXTS.get(options);
    const context = readContext ? createResourcePathContext(readContext.path, readContext) : null;
    return this.resourceLoader.ReadFormat(descriptor, bytes, createFormatReadOptions(descriptor, options), context);
  }

  /**
   * Look up and explicitly renew an existing canonical resource without
   * creating, loading, or preparing a new handle.
   *
   * @param {string} path Carbon-style source resource path.
   * @param {object} [options={}] Identity-defining resource outcome settings.
   * @returns {CjsResource|null} Existing canonical handle, or `null` when absent.
   * @throws {TypeError} If the path or identity settings cannot be normalized.
   */
  Lookup(path, options = {}) {
    const normalizedPath = normalizeResourcePath(path);
    const key = getMotherLodeKey(normalizedPath, this.GetResourceVariant(options));
    const resource = this.motherLode.Lookup(key);
    if (resource) {
      this.#BindResourceLifecycle(key, resource);
      this.motherLode.KeepAlive?.(key);
    }
    return resource;
  }

  /**
   * Forget and clean canonical resources for a source path. Omitting options
   * removes every resolved variant; supplying options removes only the exact
   * identity derived from those outcome settings. Explicitly retained source
   * and format records are independent and remain available; call
   * {@link CjsResMan#InvalidateReadCache} when they must also be forgotten.
   *
   * @param {string} path Carbon-style source resource path.
   * @param {object|null} [options=null] Exact identity settings, or `null` for all variants.
   * @returns {boolean} Whether at least one canonical resource was removed.
   * @throws {TypeError} If the path or identity settings cannot be normalized.
   * @throws {Error|AggregateError} If cleanup fails after identities are forgotten.
   */
  Delete(path, options = null) {
    if (options !== null && options !== undefined) {
      const normalizedPath = normalizeResourcePath(path);
      const key = getMotherLodeKey(normalizedPath, this.GetResourceVariant(options));
      const resource = this.motherLode.Lookup(key);
      try {
        return this.motherLode.Delete(key);
      } finally {
        if (resource && this.motherLode.Lookup(key) !== resource) {
          this.#InvalidateResourceOwnership(resource);
        }
        this.#reloadGenerations.delete(key);
      }
    }
    const normalizedPath = normalizeResourcePath(path);
    const prefix = `${normalizedPath}\u0000`;
    const entries = typeof this.motherLode?.Entries === "function" ? [...this.motherLode.Entries()].filter(([key]) => key === normalizedPath || key.startsWith(prefix)) : [];
    try {
      return this.motherLode.DeleteAllVariants(normalizedPath);
    } finally {
      for (const [key, resource] of entries) {
        this.#reloadGenerations.delete(key);
        if (this.motherLode.Lookup(key) !== resource) {
          this.#InvalidateResourceOwnership(resource);
        }
      }
    }
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
  PurgeInactive(options = {}) {
    if (typeof this.motherLode?.PurgeInactive !== "function") {
      throw new TypeError("CjsResMan MotherLode does not support PurgeInactive().");
    }
    return this.motherLode.PurgeInactive(options);
  }

  /**
   * Replace or disable the opt-in automatic inactivity policy. Configuration
   * resets cadence, so the first subsequent pump performs a sweep immediately.
   * Frame-based limits are rejected because manager updates are not a reliable
   * renderer-frame clock. The normalized policy is frozen and never reloads
   * resources.
   *
   * @param {CjsResManAutoPurgePolicy|false|null} [policy=null] Time-based policy, or `false`/`null` to disable automatic sweeping.
   * @returns {CjsResMan} This resource manager.
   * @throws {TypeError} If the policy, threshold, cleanup control, or clock is invalid.
   */
  SetAutoPurgePolicy(policy = null) {
    this.#autoPurgePolicy = normalizeAutoPurgePolicy(policy);
    this.#lastAutoPurgeTime = null;
    return this;
  }

  /**
   * Return the immutable normalized automatic inactivity policy.
   *
   * @returns {Readonly<CjsResManAutoPurgePolicy>|null} Active policy, or `null` when automatic sweeping is disabled.
   */
  GetAutoPurgePolicy() {
    return this.#autoPurgePolicy;
  }

  /**
   * Report whether {@link CjsResMan#Update} may run automatic inactivity
   * sweeps. This is a pure query and does not advance cadence or activity.
   *
   * @returns {boolean} Whether an automatic purge policy is configured.
   */
  IsAutoPurgeEnabled() {
    return this.#autoPurgePolicy !== null;
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
  PumpAutoPurge(options = {}) {
    const pump = normalizeAutoPurgePumpOptions(options);
    const policy = this.#autoPurgePolicy;
    if (!policy) return null;
    const time = pump.time === undefined ? policy.now() : pump.time;
    assertNonNegativeNumber(time, "automatic purge time");
    if (this.#lastAutoPurgeTime !== null) {
      if (time < this.#lastAutoPurgeTime) {
        this.#lastAutoPurgeTime = time;
        return null;
      }
      if (time - this.#lastAutoPurgeTime < policy.intervalMilliseconds) {
        return null;
      }
    }
    this.#lastAutoPurgeTime = time;
    return this.PurgeInactive({
      time,
      maxIdleMilliseconds: policy.maxIdleMilliseconds,
      payloadMaxIdleMilliseconds: policy.payloadMaxIdleMilliseconds,
      destroyAdapters: policy.destroyAdapters,
      releasePayload: policy.releasePayload,
      ...(policy.cleanup === undefined ? {} : {
        cleanup: policy.cleanup
      })
    });
  }

  /**
   * Cancel queued-but-not-started work, remove every canonical resource through
   * MotherLode cleanup, and reset all in-flight deduplication ledgers.
   *
   * @returns {CjsResMan} This empty resource manager.
   * @throws {AggregateError} If one or more canonical resources fail cleanup.
   */
  Clear() {
    this.#InvalidateMotherLodeOwnership(this.motherLode);
    this._loadQueue.Clear();
    this._prepareQueue.Clear();
    this.motherLode.Clear();
    this.objectOperations = new WeakMap();
    this.sourceOperations = new WeakMap();
    this.queuedSourceOperations = new WeakMap();
    this.formatOperations = new WeakMap();
    this.#reloadGenerations.clear();
    this.#lastAutoPurgeTime = null;
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
   * @returns {Readonly<{path: string, queuedSource: number, source: number, format: number}>} Frozen detached-record counts.
   * @throws {TypeError} If path, source, revision, or options are invalid.
   */
  InvalidateReadCache(path, options = {}) {
    if (!options || typeof options !== "object" || Array.isArray(options)) {
      throw new TypeError("CjsResMan.InvalidateReadCache options must be an object.");
    }
    const normalizedPath = normalizeResourcePath(path);
    const hasRevision = hasOwn(options, "sourceRevision");
    const revisionKey = hasRevision ? normalizeSourceRevision(options.sourceRevision) : null;
    const source = options.source || this.source;
    if (!source) {
      return Object.freeze({
        path: normalizedPath,
        queuedSource: 0,
        source: 0,
        format: 0
      });
    }
    if (typeof source !== "object" && typeof source !== "function" || typeof source.Read !== "function") {
      throw new TypeError("CjsResMan.InvalidateReadCache source must provide Read(path, options).");
    }
    return this.#InvalidateReadCache(source, normalizedPath, revisionKey);
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
  ReadResource(path, options = {}) {
    const read = this.#BeginReadOperation(path, options);
    return this.#ReadResource(read.context, read.options);
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
  #BeginReadOperation(path, options) {
    if (!options || typeof options !== "object" || Array.isArray(options)) {
      throw new TypeError("CjsResMan read options must be an object.");
    }
    const normalizedPath = normalizeResourcePath(path);
    const inherited = READ_CONTEXTS.get(options);
    if (inherited && inherited.resMan === this && inherited.path === normalizedPath) {
      return {
        context: inherited,
        options
      };
    }
    const source = options.source || this.source;
    if (!source || typeof source !== "object" && typeof source !== "function" || typeof source.Read !== "function") {
      throw new TypeError("CjsResMan requires a source with Read(path, options) to load objects.");
    }
    const sourceRevision = options.sourceRevision;
    const revisionKey = normalizeSourceRevision(sourceRevision);
    normalizeCachePolicy(options.cacheSource, "cacheSource");
    normalizeCachePolicy(options.cacheFormat, "cacheFormat");
    const operationOptions = {
      ...options
    };
    const ext = normalizeResourceExtension(options.ext || getResourceExtension(normalizedPath));
    const fileName = getResourceFileName(normalizedPath);
    const requiresUrl = sourceRequiresUrl(source);
    const url = requiresUrl ? this.BuildUrl(normalizedPath) : null;
    const context = Object.freeze({
      resMan: this,
      source,
      path: normalizedPath,
      resFilePath: normalizedPath,
      ext,
      fileName,
      url,
      sourcePath: url || normalizedPath,
      sourceRevision,
      revisionKey
    });
    READ_CONTEXTS.set(operationOptions, context);
    if (options.reload === true) {
      this.#InvalidateReadCache(source, normalizedPath, null);
    }
    return {
      context,
      options: operationOptions
    };
  }

  /**
   * Queue one normalized source operation and deduplicate according to the
   * caller's cache policy.
   *
   * @param {Readonly<CjsResourceReadContext>} context Normalized provenance.
   * @param {object} options Detached read options.
   * @returns {Promise<*>} Promise for source bytes/data.
   */
  #QueueReadResource(context, options) {
    const cachePolicy = normalizeCachePolicy(options.cacheSource, "cacheSource");
    const operations = getOwnerOperations(this.queuedSourceOperations, context.source, true);
    const key = getReadOperationKey(context);
    const bypassExisting = options.reload === true || cachePolicy === false;
    const existing = bypassExisting ? null : operations.get(key);
    if (existing) {
      if (cachePolicy === true) {
        existing.retain = true;
        const sourceRecord = getOwnerOperations(this.sourceOperations, context.source, false)?.get(key);
        if (sourceRecord) sourceRecord.retain = true;
      }
      return existing.promise;
    }

    /** @type {CjsResourceReadOperationRecord} */
    const record = {
      promise: null,
      path: context.path,
      revisionKey: context.revisionKey,
      retain: cachePolicy === true
    };
    record.promise = this.QueueTask(CjsResManQueue.BACKGROUND, () => this.#ReadResource(context, options, record), context.source, {
      kind: "load",
      path: context.path
    }).promise;
    if (cachePolicy !== false) operations.set(key, record);
    record.promise.then(value => {
      if (cachePolicy === false || operations.get(key) !== record) return;
      if (record.retain) this.#RetainSourceResult(context, value);
      operations.delete(key);
    }, () => {
      if (cachePolicy !== false && operations.get(key) === record) operations.delete(key);
    });
    return record.promise;
  }

  /**
   * Run or join one normalized direct source operation.
   *
   * @param {Readonly<CjsResourceReadContext>} context Normalized provenance.
   * @param {object} options Detached read options.
   * @param {CjsResourceReadOperationRecord|null} [queuedRecord=null] Parent queued record whose retention may be promoted by a later join.
   * @returns {Promise<*>} Promise for source bytes/data.
   */
  #ReadResource(context, options, queuedRecord = null) {
    const cachePolicy = normalizeCachePolicy(options.cacheSource, "cacheSource");
    const operations = getOwnerOperations(this.sourceOperations, context.source, true);
    const key = getReadOperationKey(context);
    const bypassExisting = options.reload === true || cachePolicy === false;
    const existing = bypassExisting ? null : operations.get(key);
    if (existing) {
      if (cachePolicy === true || queuedRecord?.retain) existing.retain = true;
      return existing.promise;
    }

    /** @type {CjsResourceReadOperationRecord} */
    const record = {
      promise: null,
      path: context.path,
      revisionKey: context.revisionKey,
      retain: cachePolicy === true || queuedRecord?.retain === true
    };
    record.promise = Promise.resolve().then(() => this.resourceLoader.Read(context.source, context.sourcePath, {
      ...options,
      resourcePath: context.path
    }));
    if (cachePolicy !== false) operations.set(key, record);
    record.promise.then(() => {
      if (cachePolicy !== false && !record.retain && operations.get(key) === record) {
        operations.delete(key);
      }
    }, () => {
      if (cachePolicy !== false && operations.get(key) === record) operations.delete(key);
    });
    return record.promise;
  }

  /**
   * Retain a settled source result when a queued caller upgraded cache policy
   * after the direct source promise had already completed its cleanup reaction.
   *
   * @param {Readonly<CjsResourceReadContext>} context Normalized provenance.
   * @param {*} value Settled source result.
   * @returns {void}
   */
  #RetainSourceResult(context, value) {
    const operations = getOwnerOperations(this.sourceOperations, context.source, true);
    const key = getReadOperationKey(context);
    const existing = operations.get(key);
    if (existing) {
      existing.retain = true;
      return;
    }
    operations.set(key, {
      promise: Promise.resolve(value),
      path: context.path,
      revisionKey: context.revisionKey,
      retain: true
    });
  }

  /**
   * Remove future-reuse records matching one selected source and path.
   * A null revision removes all revisions.
   *
   * @param {object|Function} source Selected source.
   * @param {string} path Normalized source path.
   * @param {string|null} revisionKey Exact revision key or `null` for all.
   * @returns {Readonly<{path: string, queuedSource: number, source: number, format: number}>} Frozen detached counts.
   */
  #InvalidateReadCache(source, path, revisionKey) {
    const queuedSource = removeOperationRecords(getOwnerOperations(this.queuedSourceOperations, source, false), path, revisionKey);
    const sourceCount = removeOperationRecords(getOwnerOperations(this.sourceOperations, source, false), path, revisionKey);
    let format = 0;
    const descriptors = this.formatOperations.get(source);
    if (descriptors) {
      for (const [descriptor, operations] of descriptors) {
        format += removeOperationRecords(operations, path, revisionKey);
        if (operations.size === 0) descriptors.delete(descriptor);
      }
      if (descriptors.size === 0) this.formatOperations.delete(source);
    }
    return Object.freeze({
      path,
      queuedSource,
      source: sourceCount,
      format
    });
  }

  /**
   * Construct and initialize one resource handle, optionally rejecting a
   * singleton alias before `Initialize()` can mutate the protected owner.
   *
   * @param {Function} Constructor Resource constructor selected for the outcome.
   * @param {string} path Normalized Carbon-style resource path.
   * @param {string} ext Normalized resource extension.
   * @param {object} [options={}] Constructor values, requested output, semantic requirement, and source provenance.
   * @param {object|Function|null} [disallowedAlias=null] Existing owner that a staged candidate must not reuse.
   * @param {object|null} [extensionRoute=null] Immutable explicit extension route captured for this handle.
   * @returns {CjsResource} Initialized resource-compatible handle.
   * @throws {TypeError|Error} If construction, candidate identity, or initialization is invalid.
   */
  CreateResource(Constructor, path, ext, options = {}, disallowedAlias = null, extensionRoute = null) {
    const resource = new Constructor(options.values);
    if (!resource || typeof resource.Initialize !== "function") {
      throw new TypeError("Resource constructor must create a CjsResource-compatible object.");
    }
    if (disallowedAlias && resource === disallowedAlias) {
      throw reloadCandidateAliasError(path, resource);
    }
    if (extensionRoute) {
      this.#resourceExtensionRoutes.set(resource, extensionRoute);
      const handlerMode = Constructor === extensionRoute.Handler ? extensionRoute.handlerMode : Object.values(ResourceHandlerMode).includes(Constructor.handlerMode) ? Constructor.handlerMode : ResourceHandlerMode.RESOURCE;
      this.#resourceHandlerModes.set(resource, handlerMode);
    }
    resource.Initialize(path, ext, normalizeRequirement(options.requirement || options.payload || ""));
    if (typeof resource.SetObjectLoader === "function") {
      const loaderOptions = getResourceLoaderOptions(options, options.source || this.source);
      resource.SetObjectLoader(loadOptions => this.GetObject(path, mergeResourceLoaderOptions(loaderOptions, loadOptions)), loaderOptions);
    }
    return resource;
  }

  /**
   * Resolve the current resource constructor for a semantic request. Explicit
   * requirement/payload selection precedes an emitted-output registration;
   * otherwise the generic `CjsResource` handle is used.
   *
   * @param {object} [options={}] Semantic requirement, payload, and emit request.
   * @param {object|null} [extensionRoute=null] Captured extension-selected default handler.
   * @returns {Function} Registered resource constructor or `CjsResource`.
   */
  ResolveResourceConstructor(options = {}, extensionRoute = null) {
    const requested = normalizeRequirement(options.requirement || options.payload);
    if (requested && this.resourceTypes.has(requested)) return this.resourceTypes.get(requested);
    const emitted = normalizeRequirement(options.emit);
    if (emitted && this.resourceTypes.has(emitted)) return this.resourceTypes.get(emitted);
    if (extensionRoute) return extensionRoute.Handler;
    return CjsResource;
  }

  /**
   * Resolve the promised output tag used with the normalized source path.
   *
   * An explicit `variant` wins. Otherwise the requested emitted output is the
   * promise, followed by the semantic requirement/payload for resource-only
   * requests. Reader classes, constructors, and format options
   * are execution details and never enter this identity.
   *
   * @param {object} [options={}] Resource request containing an optional output tag.
   * @returns {string} Normalized promised output tag, or an empty string for the default outcome.
   * @throws {TypeError} If options or its selected tag is invalid.
   */
  GetResourceVariant(options = {}) {
    if (!options || typeof options !== "object" || Array.isArray(options)) {
      throw new TypeError("CjsResMan resource variant options must be an object.");
    }
    if (hasOwn(options, "variant") && options.variant !== undefined) {
      if (typeof options.variant !== "string" || options.variant.trim() === "") {
        throw new TypeError("CjsResMan explicit resource variant must be a non-empty string.");
      }
      return normalizeResourceVariant(options.variant);
    }
    return normalizeResourceVariant(options.emit ?? options.requirement ?? options.payload ?? "");
  }

  /**
   * Retain a low-level queue task only until settlement so `Wait()` can take a
   * synchronous snapshot without making completed values long-lived.
   *
   * @param {object} task Queue task returned by `CjsResManWorkQueue.Add()`.
   * @returns {object} The supplied task.
   */
  #TrackQueueTask(task) {
    this.#queueOperations.set(task, task.promise);
    task.promise.then(() => {
      if (this.#queueOperations.get(task) === task.promise) {
        this.#queueOperations.delete(task);
      }
    }, () => {
      if (this.#queueOperations.get(task) === task.promise) {
        this.#queueOperations.delete(task);
      }
    });
    return task;
  }

  /**
   * Open one active resource-mutation record. Queued records additionally own
   * a settlement promise visible to contemporaneous `Wait()` snapshots;
   * direct records block unsafe MotherLode replacement but remain outside that
   * two-queue fence.
   *
   * @param {boolean} queued Whether the operation belongs to the queued fence.
   * @returns {() => void} Idempotent record completion callback.
   */
  #BeginResourceOperation(queued) {
    this.#activeResourceOperations += 1;
    const id = queued ? this.#nextResourceOperationId++ : 0;
    let resolveDone = noop;
    const done = queued ? new Promise(resolve => {
      resolveDone = resolve;
    }) : null;
    if (queued) this.#resourceOperations.set(id, done);
    let finished = false;
    return () => {
      if (finished) return;
      finished = true;
      this.#activeResourceOperations = Math.max(0, this.#activeResourceOperations - 1);
      if (queued && this.#resourceOperations.get(id) === done) {
        this.#resourceOperations.delete(id);
      }
      resolveDone();
    };
  }

  /**
   * Return the known canonical authority for a resource and reject a known
   * stale generation. A never-bound resource returns `null` so historical
   * detached prepare/publication helpers remain compatible.
   *
   * @param {object|Function} resource Candidate resource handle.
   * @param {string} phase Operation phase used for stale diagnostics.
   * @returns {CjsResourceOwnership|null} Current authority or `null` when never bound.
   * @throws {Error} If a previously bound resource is no longer canonical.
   */
  #GetResourceOwnership(resource, phase) {
    const ownership = this.#resourceOwnership.get(resource) || null;
    if (!ownership) return null;
    this.#AssertResourceOwnership(ownership, phase);
    return ownership;
  }

  /**
   * Require a current manager-owned canonical resource authority.
   *
   * @param {object|Function} resource Candidate resource handle.
   * @param {string} phase Operation phase used for diagnostics.
   * @returns {CjsResourceOwnership} Current canonical authority.
   * @throws {Error} If the resource is unknown or no longer canonical.
   */
  #RequireResourceOwnership(resource, phase) {
    const ownership = this.#GetResourceOwnership(resource, phase);
    if (ownership) return ownership;
    throw resourceNotOwnedError(resource, phase);
  }

  /**
   * Test whether an asynchronous operation still owns publication authority.
   * Registry lookup failures are treated as stale ownership so they cannot
   * replace an operation's more useful underlying source/stage rejection.
   *
   * @param {CjsResourceOwnership} ownership Captured authority.
   * @returns {boolean} Whether the exact generation remains canonical.
   */
  #IsResourceOwnershipCurrent(ownership) {
    try {
      return Boolean(ownership && this.motherLode === ownership.owner && this.#resourceOwnership.get(ownership.resource) === ownership && !this.#invalidResourceOwnership.has(ownership.resource) && ownership.owner.Lookup(ownership.key) === ownership.resource && !ownership.resource.IsPurged?.());
    } catch {
      return false;
    }
  }

  /**
   * Assert exact canonical publication authority for one operation phase.
   *
   * @param {CjsResourceOwnership} ownership Captured authority.
   * @param {string} phase Human-readable operation phase.
   * @returns {void}
   * @throws {Error} Stable stale-operation error when ownership changed.
   */
  #AssertResourceOwnership(ownership, phase) {
    if (!this.#IsResourceOwnershipCurrent(ownership)) {
      throw staleResourceOperationError(ownership, phase);
    }
  }

  /**
   * Assert a captured authority when a compatibility path supplied one.
   *
   * @param {CjsResourceMutationAuthority|null} ownership Optional canonical or reload-candidate authority.
   * @param {string} phase Human-readable operation phase.
   * @returns {void}
   */
  #AssertOptionalResourceOwnership(ownership, phase) {
    if (!ownership) return;
    if (ownership.reloadCandidate === true) {
      this.#AssertReloadCandidate(ownership, phase);
      return;
    }
    this.#AssertResourceOwnership(ownership, phase);
  }

  /**
   * Test the exact former owner plus newest-request token for an off-registry
   * candidate. Lookup failures are treated as stale so detached work cannot
   * resurrect a deleted, cleared, replaced, or superseded identity.
   *
   * @param {CjsResourceReloadCandidate} candidate Candidate authority.
   * @returns {boolean} Whether this candidate alone may still commit.
   */
  #IsReloadCandidateCurrent(candidate) {
    try {
      return Boolean(candidate && candidate.reloadCandidate === true && this.motherLode === candidate.owner && this.#reloadCandidates.get(candidate.resource) === candidate && this.#reloadGenerations.get(candidate.key) === candidate.generation && this.#resourceOwnership.get(candidate.expected) === candidate.expectedOwnership && this.#IsResourceOwnershipCurrent(candidate.expectedOwnership) && candidate.owner.Lookup(candidate.key) === candidate.expected);
    } catch {
      return false;
    }
  }

  /**
   * Assert that a staged candidate still owns newest-request publication
   * authority for one operation phase.
   *
   * @param {CjsResourceReloadCandidate} candidate Candidate authority.
   * @param {string} phase Human-readable operation phase.
   * @returns {void}
   * @throws {Error} Stable stale-candidate error when authority changed.
   */
  #AssertReloadCandidate(candidate, phase) {
    if (!this.#IsReloadCandidateCurrent(candidate)) {
      throw staleReloadCandidateError(candidate, phase);
    }
  }

  /**
   * Invalidate the currently recorded generation for a removed resource.
   *
   * @param {object|Function} resource Removed or displaced resource.
   * @returns {void}
   */
  #InvalidateResourceOwnership(resource) {
    if (resource && (typeof resource === "object" || typeof resource === "function")) {
      this.#invalidResourceOwnership.add(resource);
    }
  }

  /**
   * Invalidate every generation currently owned by one registry. This runs
   * before Clear cancellation/cleanup so reentrant observers cannot retain
   * authority after canonical ownership removal begins.
   *
   * @param {CjsMotherLode|null|undefined} owner Registry losing ownership.
   * @returns {void}
   */
  #InvalidateMotherLodeOwnership(owner) {
    if (typeof owner?.Entries !== "function") return;
    for (const [, resource] of owner.Entries()) {
      const ownership = this.#resourceOwnership.get(resource);
      if (ownership?.owner === owner) this.#invalidResourceOwnership.add(resource);
    }
  }

  /**
   * Add one operation-owned purge lock and release it only while the exact
   * captured canonical record still exists. If removal/replacement made the
   * operation stale, its former MotherLode record (and lock count) no longer
   * exists, so releasing through a rebound resource would corrupt a new owner.
   *
   * @param {CjsResourceOwnership} ownership Captured canonical authority.
   * @returns {() => void} Idempotent balanced release callback.
   */
  #AcquireResourcePurgeLock(ownership) {
    const {
      owner,
      key
    } = ownership;
    if (typeof owner?.Lock !== "function" || typeof owner?.Unlock !== "function") {
      return noop;
    }
    this.#AssertResourceOwnership(ownership, "lock:acquire");
    owner.Lock(key);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      if (this.#IsResourceOwnershipCurrent(ownership)) owner.Unlock(key);
    };
  }

  /**
   * Bind resource-facing liveness methods to one canonical MotherLode key.
   * The controller contains no loader/reload callback, so touching a detached
   * or purged handle cannot start browser/network work.
   *
   * @param {string} key Canonical MotherLode identity.
   * @param {object|Function} resource Canonical resource handle.
   * @returns {object|Function} The supplied resource.
   */
  /**
   * Reload a purged handle back into itself.
   *
   * Purge deletes the payload and drops the registry entry, so a consumer left
   * holding the handle has no way to reach a replacement - it cannot discover
   * one, and nothing hands it over. Recovery therefore has to fill THIS handle
   * rather than resolve whatever the manager currently caches for the path.
   *
   * The handle is re-registered BEFORE loading, so the ordinary load path finds
   * it as the canonical identity and loads into it instead of minting another.
   *
   * Declines rather than guesses in two cases: when another resource has since
   * claimed the identity - displacing it would kill whoever holds that one, the
   * very failure being fixed here - and when the retained request no longer
   * resolves to the same identity, which would re-register the handle under the
   * wrong key.
   *
   * @param {string} key Canonical resolved identity key.
   * @param {CjsResource} resource The purged handle to restore.
   * @returns {boolean} Whether a reload was started.
   */
  #ReloadPurgedResource(key, resource) {
    if (!resource?.IsPurged?.()) return false;
    try {
      const current = this.motherLode.Lookup(key);
      if (current && current !== resource) return false;
      const request = resource.GetObjectRequest?.() || {};
      const path = normalizeResourcePath(resource.GetPath());
      if (getMotherLodeKey(path, this.GetResourceVariant(request)) !== key) return false;

      // Leave PURGED first: ownership is not considered current while purged,
      // so binding before this would produce a controller that no-ops.
      resource.MarkRequested();
      if (!current) this.motherLode.Insert(key, resource, {
        replace: true
      });
      this.#invalidResourceOwnership.delete(resource);
      this.#BindResourceLifecycle(key, resource);

      // Failure is recorded on the resource and observed through `completed`.
      this.GetObject(path, request).catch(() => {});
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Give one resource the liveness callbacks its consumers never manage
   * themselves: activity renewal, payload renewal, lock counting, and the
   * reload hook that revives the handle after a purge.
   *
   * Ownership is captured by generation, so a late release can never renew or
   * unlock a rebound owner. The reload hook is bound outside the lifecycle
   * controller because that controller is detached exactly when canonical
   * ownership ends, which is precisely when a purged handle needs to come back.
   *
   * @param {string} key Canonical resolved key.
   * @param {object} resource Resource handle to bind.
   * @returns {object} The same resource handle.
   */
  #BindResourceLifecycle(key, resource) {
    const owner = this.motherLode;
    let ownership = this.#resourceOwnership.get(resource) || null;
    if (!ownership || ownership.owner !== owner || ownership.key !== key || ownership.resource !== resource || !this.#IsResourceOwnershipCurrent(ownership)) {
      ownership = Object.freeze({
        generation: this.#nextResourceOwnershipGeneration++,
        owner,
        key,
        resource
      });
      this.#resourceOwnership.set(resource, ownership);
      this.#invalidResourceOwnership.delete(resource);
    }

    // Bound outside the lifecycle controller, which is detached when canonical
    // ownership ends - which is precisely when a handle needs to come back.
    resource?.SetReloadHook?.(() => this.#ReloadPurgedResource(key, resource));
    if (typeof resource?.SetLifecycleController !== "function") return resource;
    resource.SetLifecycleController(Object.freeze({
      isCurrent: () => this.#IsResourceOwnershipCurrent(ownership),
      keepAlive: options => this.#IsResourceOwnershipCurrent(ownership) ? owner.KeepAlive?.(key, options) : null,
      keepPayloadAlive: options => {
        if (!this.#IsResourceOwnershipCurrent(ownership)) return null;
        if (typeof owner.KeepPayloadAlive === "function") {
          return owner.KeepPayloadAlive(key, options);
        }
        return owner.KeepAlive?.(key, options);
      },
      lock: () => this.#IsResourceOwnershipCurrent(ownership) ? owner.Lock?.(key) || 0 : 0,
      unlock: () => this.#IsResourceOwnershipCurrent(ownership) ? owner.Unlock?.(key) || 0 : 0
    }));
    if (resource.HasPayload?.() && this.#IsResourceOwnershipCurrent(ownership)) {
      owner.KeepPayloadAlive?.(key);
    }
    return resource;
  }

  /**
   * Bind lifecycle callbacks for resources supplied by a configured custom
   * MotherLode before CjsResMan begins serving them.
   *
   * @returns {CjsResMan} This resource manager.
   */
  #BindMotherLodeResources() {
    if (typeof this.motherLode?.Entries !== "function") return this;
    for (const [key, resource] of this.motherLode.Entries()) {
      this.#BindResourceLifecycle(key, resource);
    }
    return this;
  }

  /**
   * Run or join one format read under source/path/revision, frozen descriptor,
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
   * @param {CjsResource} resource Resource whose normalized path identifies the source data.
   * @param {object} descriptor Frozen registered format descriptor.
   * @param {*} bytes Source bytes or source-compatible reader input.
   * @param {object} [options={}] Source provenance, reload, cacheFormat, emit, classes, and format options.
   * @returns {Promise<*>} Promise for the parsed or converted format result.
   * @throws {TypeError|Error} If resource, source, revision, descriptor, cache policy, or format execution is invalid.
   */
  ReadFormatOnce(resource, descriptor, bytes, options = {}) {
    const read = this.#BeginReadOperation(resource.GetPath(), options);
    const cachePolicy = normalizeCachePolicy(read.options.cacheFormat, "cacheFormat");
    const key = getFormatOperationKey(read.context, read.options);
    const cacheableOptions = key !== null && cachePolicy !== false;
    const descriptorOperations = cacheableOptions ? getFormatDescriptorOperations(this.formatOperations, read.context.source, descriptor, true) : null;
    const bypassExisting = read.options.reload === true || !cacheableOptions;
    const existing = bypassExisting ? null : descriptorOperations.get(key);
    if (existing) {
      if (cachePolicy === true) existing.retain = true;
      return existing.promise;
    }

    /** @type {CjsResourceReadOperationRecord} */
    const record = {
      promise: Promise.resolve().then(() => this.ReadFormat(descriptor, bytes, read.options)),
      path: read.context.path,
      revisionKey: read.context.revisionKey,
      retain: cachePolicy === true
    };
    if (cacheableOptions) descriptorOperations.set(key, record);
    record.promise.then(() => {
      if (cacheableOptions && !record.retain && descriptorOperations.get(key) === record) {
        descriptorOperations.delete(key);
      }
    }, () => {
      if (cacheableOptions && descriptorOperations.get(key) === record) {
        descriptorOperations.delete(key);
      }
    });
    return record.promise;
  }
}

/**
 * Copy supported registered format defaults into a deeply frozen snapshot.
 * Plain objects and arrays may be cyclic. Functions and primitives are stable
 * leaves; values with hidden mutable state are rejected because freezing their
 * wrapper would not make the represented behavior immutable.
 *
 * @param {object} defaults Registered format defaults.
 * @param {WeakMap<object, object>} [seen=new WeakMap()] Source-to-snapshot cycle map.
 * @returns {Readonly<object>} Deeply frozen plain defaults snapshot.
 * @throws {TypeError} If defaults contain unsupported objects, accessors, symbols, or byte buffers.
 */
function snapshotFormatDefaults(defaults, seen = new WeakMap()) {
  if (!defaults || typeof defaults !== "object" || Array.isArray(defaults)) {
    throw new TypeError("CjsResMan format defaults must be a plain object.");
  }
  return snapshotFormatDefaultValue(defaults, seen, "defaults");
}

/**
 * Snapshot one value in a registered format-default tree.
 *
 * @param {*} value Source value.
 * @param {WeakMap<object, object>} seen Source-to-snapshot cycle map.
 * @param {string} path Diagnostic property path.
 * @returns {*} Frozen snapshot value or stable primitive/function leaf.
 * @throws {TypeError} If the value cannot be made structurally immutable.
 */
function snapshotFormatDefaultValue(value, seen, path) {
  if (value === null || value === undefined) return value;
  const type = typeof value;
  if (["string", "number", "boolean", "bigint"].includes(type)) return value;
  if (type === "function") return value;
  if (type !== "object" || ArrayBuffer.isView(value) || value instanceof ArrayBuffer) {
    throw new TypeError(`CjsResMan format ${path} cannot be snapshotted immutably.`);
  }
  const prior = seen.get(value);
  if (prior) return prior;
  if (Array.isArray(value)) {
    const snapshot = [];
    seen.set(value, snapshot);
    for (let index = 0; index < value.length; index += 1) {
      if (!hasOwn(value, index)) {
        throw new TypeError(`CjsResMan format ${path} must not contain sparse arrays.`);
      }
      snapshot.push(snapshotFormatDefaultValue(value[index], seen, `${path}[${index}]`));
    }
    return Object.freeze(snapshot);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`CjsResMan format ${path} must contain only plain objects and arrays.`);
  }
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new TypeError(`CjsResMan format ${path} must not contain symbol keys.`);
  }
  const snapshot = prototype === null ? Object.create(null) : {};
  seen.set(value, snapshot);
  for (const key of Object.getOwnPropertyNames(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor.enumerable || !("value" in descriptor)) {
      throw new TypeError(`CjsResMan format ${path}.${key} must be an enumerable data property.`);
    }
    snapshot[key] = snapshotFormatDefaultValue(descriptor.value, seen, `${path}.${key}`);
  }
  return Object.freeze(snapshot);
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
function normalizeSourceRevision(value) {
  if (value === undefined) return "undefined";
  if (typeof value === "string") return `string:${value}`;
  if (typeof value === "number" && Number.isFinite(value)) {
    return `number:${Object.is(value, -0) ? 0 : value}`;
  }
  throw new TypeError("CjsResMan sourceRevision must be a string or finite number.");
}

/**
 * Validate tri-state source/format cache policy.
 *
 * @param {boolean|undefined} value Cache policy value.
 * @param {string} name Option name used in failures.
 * @returns {boolean|undefined} The validated policy.
 * @throws {TypeError} If the value is not boolean or omitted.
 */
function normalizeCachePolicy(value, name) {
  if (value !== undefined && typeof value !== "boolean") {
    throw new TypeError(`CjsResMan ${name} must be a boolean when supplied.`);
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
function getOwnerOperations(ledger, owner, create) {
  let operations = ledger.get(owner);
  if (!operations && create) {
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
function getReadOperationKey(context) {
  return `${context.path}\u0000${context.revisionKey}`;
}

/**
 * Get the descriptor-specific format operation map for a selected source.
 * Frozen descriptor identity isolates changed registration defaults.
 *
 * @param {WeakMap<object|Function, Map<object, Map<string, CjsResourceReadOperationRecord>>>} ledger Format ledger.
 * @param {object|Function} source Selected source owner.
 * @param {object} descriptor Frozen registered descriptor.
 * @param {boolean} create Whether missing maps should be allocated.
 * @returns {Map<string, CjsResourceReadOperationRecord>|null} Descriptor map or `null`.
 */
function getFormatDescriptorOperations(ledger, source, descriptor, create) {
  let descriptors = ledger.get(source);
  if (!descriptors && create) {
    descriptors = new Map();
    ledger.set(source, descriptors);
  }
  if (!descriptors) return null;
  let operations = descriptors.get(descriptor);
  if (!operations && create) {
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
function getFormatOperationKey(context, options) {
  const material = [options.emit, options.mediaType, options.classes, options.formatOptions];
  if (!material.every(value => isCanonicalFormatCacheValue(value))) return null;
  return `${getReadOperationKey(context)}\u0000${material.map(value => serializeFormatCacheValue(value)).join("\u0001")}`;
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
function isCanonicalFormatCacheValue(value, seen = new WeakSet()) {
  if (value === null || value === undefined) return true;
  if (["string", "number", "boolean", "bigint"].includes(typeof value)) return true;
  if (typeof value === "function") return true;
  if (typeof value !== "object") return false;
  if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) return true;
  if (seen.has(value)) return true;
  seen.add(value);
  if (Array.isArray(value)) {
    return value.every(entry => isCanonicalFormatCacheValue(entry, seen));
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  if (Object.getOwnPropertySymbols(value).length > 0) return false;
  return Object.getOwnPropertyNames(value).every(key => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor.enumerable && "value" in descriptor && isCanonicalFormatCacheValue(descriptor.value, seen);
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
function serializeFormatCacheValue(value, seen = new WeakSet()) {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "string") return `string:${JSON.stringify(value)}`;
  if (typeof value === "number") {
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
  if (ArrayBuffer.isView(value)) {
    const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    return `view:${identity}:${value.constructor.name}:${[...bytes].join(",")}`;
  }
  if (value instanceof ArrayBuffer) {
    return `buffer:${identity}:${[...new Uint8Array(value)].join(",")}`;
  }
  if (Array.isArray(value)) {
    return `array:${identity}:[${value.map(entry => serializeFormatCacheValue(entry, seen)).join(",")}]`;
  }
  return `object:${identity}:{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${serializeFormatCacheValue(value[key], seen)}`).join(",")}}`;
}

/**
 * Return a process-local identity for a parsed-format cache object or function.
 *
 * @param {object|Function} value Candidate option identity owner.
 * @returns {number} Stable identity for the life of the value.
 */
function getLocalValueIdentity(value) {
  let identity = LOCAL_VALUE_IDENTITIES.get(value);
  if (!identity) {
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
function removeOperationRecords(operations, path, revisionKey) {
  if (!operations) return 0;
  let removed = 0;
  for (const [key, record] of operations) {
    if (record.path !== path) continue;
    if (revisionKey !== null && record.revisionKey !== revisionKey) continue;
    if (operations.delete(key)) removed += 1;
  }
  return removed;
}

/**
 * Copy the compact requested-output fields needed for explicit payload
 * reconstruction. This request is retained with the handle but never enters
 * MotherLode identity beyond its `variant`/`emit` output tag.
 *
 * @param {object} [options={}] Original resource request.
 * @returns {object} Shallow reconstruction request without cache/reload policy.
 */
function getResourceRequestOptions(options = {}) {
  const request = {};
  for (const key of RESOURCE_REQUEST_OPTION_KEYS) {
    if (options[key] !== undefined) request[key] = options[key];
  }
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
function getResourceLoaderOptions(options = {}, effectiveSource = null) {
  const loaderOptions = getResourceRequestOptions(options);
  if (effectiveSource) loaderOptions.source = effectiveSource;
  for (const key of ["sourceRevision", "ext"]) {
    if (hasOwn(options, key)) {
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
function mergeResourceLoaderOptions(base, overrides = {}) {
  const result = {
    ...base,
    ...overrides
  };
  const pinsOutput = RESOURCE_OUTPUT_OPTION_KEYS.some(key => hasOwn(base, key) && base[key] !== undefined);
  if (pinsOutput) {
    for (const key of RESOURCE_OUTPUT_OPTION_KEYS) {
      if (hasOwn(base, key) && base[key] !== undefined) {
        result[key] = base[key];
      } else {
        delete result[key];
      }
    }
  }
  for (const key of RESOURCE_PROVENANCE_OPTION_KEYS) {
    if (hasOwn(base, key)) result[key] = base[key];
  }
  return result;
}

/**
 * Filter current format descriptors using request material available before
 * source bytes are read. Byte-dependent support probes are deferred.
 *
 * @param {readonly object[]} descriptors Registered descriptors for one extension.
 * @param {object} options Format, output, and media selection.
 * @returns {object[]} Matching descriptors in registration order.
 */
function filterFormatDescriptors(descriptors, options) {
  let candidates = [...descriptors];
  if (options.format) {
    candidates = candidates.filter(({
      Format
    }) => Format === options.format || Format.id === options.format || Format.name === options.format);
  }
  if (options.emit !== undefined) {
    candidates = candidates.filter(({
      Format
    }) => findDeclaredOutput(getFormatOutputs(Format), options.emit) !== null);
  }
  if (options.mediaType) {
    candidates = candidates.filter(({
      Format
    }) => (Format.mediaTypes || []).includes(options.mediaType));
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
function resolveOrderedExtensionFormatDescriptor(descriptors, ext, options) {
  const candidates = filterFormatDescriptors(descriptors, options);
  if (descriptors.length > 0 && candidates.length === 0 && options.emit !== undefined) {
    throw createFormatOutputMissingError(ext, options.emit, descriptors);
  }
  if (candidates.length === 0) {
    const error = new Error(`No format registered for .${ext}`);
    error.code = "CJS_RESOURCE_FORMAT_MISSING";
    error.ext = ext;
    throw error;
  }
  for (const descriptor of candidates) {
    const {
      Format,
      defaults
    } = descriptor;
    if (typeof Format.isSupported !== "function") return descriptor;
    const report = Format.isSupported(options.bytes, {
      ...defaults,
      ...(options.formatOptions || {})
    });
    if (isPositiveFormatProbe(report)) return descriptor;
  }
  const error = new Error(`No registered format supports the content for .${ext}`);
  error.code = "CJS_RESOURCE_FORMAT_UNSUPPORTED";
  error.ext = ext;
  error.formats = candidates.map(({
    Format
  }) => Format.name);
  throw error;
}

/** Tests the supported forms returned by current format probes. */
function isPositiveFormatProbe(report) {
  if (report === true) return true;
  if (!report || report === false || typeof report !== "object") return false;
  return report.supported === true || report.supported === "full" || report.supported === "partial";
}

/**
 * Return one format facade's normal and diagnostic output declarations.
 *
 * @param {Function} Format Registered format facade.
 * @returns {Array<*>} Declared output values in selection order.
 */
function getFormatOutputs(Format) {
  return [...(Format.outputTypes || []), ...(Format.debugOutputTypes || [])];
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
function findDeclaredOutput(outputs, requested) {
  const normalized = normalizeResourceVariant(requested);
  for (const output of outputs) {
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
function createFormatOutputMissingError(ext, emit, descriptors) {
  const error = new Error(`No format registered for .${ext} emits ${JSON.stringify(emit)}.`);
  error.code = "CJS_RESOURCE_FORMAT_OUTPUT_MISSING";
  error.ext = ext;
  error.emit = emit;
  error.formats = descriptors.map(({
    Format
  }) => Format.name);
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
function createObjectLoaderOutputMissingError(ext, emit) {
  const error = new Error(`Direct loader for .${ext} exposes only its unforced default; it does not emit ${JSON.stringify(emit)}.`);
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
function resolveFormatDescriptorCandidates(descriptors, ext, options) {
  let candidates = [...descriptors];
  if (candidates.length > 1 && options.bytes !== undefined) {
    const supported = candidates.filter(descriptor => {
      const {
        Format,
        defaults
      } = descriptor;
      const isSupported = Format.isSupported;
      if (typeof isSupported !== "function") return false;
      const report = isSupported.call(Format, options.bytes, {
        ...defaults,
        ...(options.formatOptions || {})
      });
      return isPositiveFormatProbe(report);
    });
    if (supported.length === 1) candidates = supported;
  }
  if (candidates.length === 0) {
    const error = new Error(`No format registered for .${ext}`);
    error.code = "CJS_RESOURCE_FORMAT_MISSING";
    error.ext = ext;
    throw error;
  }
  if (candidates.length > 1) {
    const error = new Error(`Ambiguous formats registered for .${ext}`);
    error.code = "CJS_RESOURCE_FORMAT_AMBIGUOUS";
    error.ext = ext;
    error.formats = candidates.map(({
      Format
    }) => Format.name);
    throw error;
  }
  return candidates[0];
}
function normalizeRequirement(value) {
  return value === null || value === undefined ? "" : String(value).trim().toLowerCase();
}

/**
 * Normalize one human-readable promised output tag.
 *
 * @param {*} value Candidate `variant`, `emit`, requirement, or payload tag.
 * @returns {string} Trimmed lowercase tag, or an empty string.
 * @throws {TypeError} If a non-empty tag is not a string or contains the internal key delimiter.
 */
function normalizeResourceVariant(value) {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value !== "string") {
    throw new TypeError("CjsResMan resource variant must be a string.");
  }
  const normalized = value.trim().toLowerCase();
  if (normalized.includes("\u0000")) {
    throw new TypeError("CjsResMan resource variant may not contain a null character.");
  }
  return normalized;
}
function createPrepareContext(resMan, resource, bytes, options, stage) {
  return Object.freeze({
    ...options,
    ...createResourcePathContext(resource.GetPath(), READ_CONTEXTS.get(options)),
    stage,
    bytes,
    resource,
    resMan
  });
}

/**
 * Create the immutable, source-neutral path context shared by format readers,
 * direct object loaders, target identification, and target hydration.
 *
 * @param {string} path Normalized or caller-supplied resource path.
 * @param {CjsResourceReadContext|null|undefined} [readContext] Active source read context.
 * @returns {Readonly<{path: string, resFilePath: string, ext: string, fileName: string, url: string|null}>}
 */
function createResourcePathContext(path, readContext = null) {
  const resFilePath = normalizeResourcePath(path);
  return Object.freeze({
    path: resFilePath,
    resFilePath,
    ext: readContext?.ext ?? getResourceExtension(resFilePath),
    fileName: getResourceFileName(resFilePath),
    url: readContext?.url ?? null
  });
}

/**
 * Return the normalized final component of a resource path without query or
 * fragment material.
 *
 * @param {string} path Resource path.
 * @returns {string} Lowercase normalized filename, or an empty string.
 */
function getResourceFileName(path) {
  const normalized = normalizeResourcePath(path);
  const queryIndex = normalized.search(/[?#]/u);
  const cleanPath = queryIndex === -1 ? normalized : normalized.slice(0, queryIndex);
  const slashIndex = cleanPath.lastIndexOf("/");
  return cleanPath.slice(slashIndex + 1);
}

/**
 * The mode this resource publishes under.
 *
 * There are two modes and there have only ever been two - RESOURCE hands back
 * the stable handle, OBJECT hands back the reader outcome - but the question
 * was answered in four branches at each of two call sites, because a resource
 * reached without a registered route has no captured mode to read. Both sites
 * then re-derived the same rule inline, and both had to be kept in agreement by
 * hand.
 *
 * The route's captured mode wins when there is one, since that is what the
 * registration declared. Otherwise the class answers for itself: anything
 * deriving from `CjsResource` carries a `handlerMode`, and a bare `CjsResource`
 * is a carrier rather than a semantic resource, so it publishes its payload.
 * That last case is why the class static cannot simply be trusted - the base
 * declares RESOURCE for the subclasses that inherit it, not for itself.
 *
 * @param {object} resource Resource being published or read back.
 * @param {string|null} [routedMode] Mode captured at registration, when routed.
 * @returns {string} A `ResourceHandlerMode` value.
 */
function resolveResourceHandlerMode(resource, routedMode = null) {
  if (routedMode === ResourceHandlerMode.RESOURCE) return ResourceHandlerMode.RESOURCE;
  if (routedMode === ResourceHandlerMode.OBJECT) return ResourceHandlerMode.OBJECT;
  if (resource?.constructor === CjsResource) return ResourceHandlerMode.OBJECT;
  return typeof resource?.SetPayload === "function" ? ResourceHandlerMode.RESOURCE : ResourceHandlerMode.OBJECT;
}

/**
 * Recover the public object result represented by a resident resource payload.
 *
 * The read-back counterpart of publication, and it must agree with it exactly:
 * a resource published as its handle has to be recovered as its handle, or a
 * cache hit answers differently from the load that filled it.
 *
 * @param {CjsResource} resource Resource with an attached CPU payload.
 * @param {object|null} route Captured explicit extension route.
 * @param {string|null} handlerMode Captured effective handler mode.
 * @returns {*} Resident public object outcome.
 */
function getPublishedResourceObject(resource, route = null, handlerMode = null) {
  const mode = resolveResourceHandlerMode(resource, route ? handlerMode : null);
  return mode === ResourceHandlerMode.RESOURCE ? resource : resource.GetPayload();
}
function assertPositiveInteger(value, name) {
  if (!Number.isInteger(value) || value < 1) {
    throw new TypeError(`CjsResMan ${name} must be a positive integer.`);
  }
}
function assertNonNegativeInteger(value, name) {
  if (!Number.isInteger(value) || value < 0) {
    throw new TypeError(`CjsResMan ${name} must be a non-negative integer.`);
  }
}
function assertNonNegativeNumber(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new TypeError(`CjsResMan ${name} must be a non-negative finite number.`);
  }
}

/**
 * Normalize and freeze an opt-in time-based automatic purge policy.
 *
 * @param {CjsResManAutoPurgePolicy|false|null} policy Caller policy or disable marker.
 * @returns {Readonly<CjsResManAutoPurgePolicy>|null} Frozen normalized policy, or `null` when disabled.
 * @throws {TypeError} If fields, limits, cleanup controls, or the cadence clock are invalid.
 */
function normalizeAutoPurgePolicy(policy) {
  if (policy === null || policy === undefined || policy === false) return null;
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new TypeError("CjsResMan autoPurgePolicy must be an object, false, or null.");
  }
  const allowed = new Set(["intervalMilliseconds", "maxIdleMilliseconds", "payloadMaxIdleMilliseconds", "destroyAdapters", "releasePayload", "cleanup", "now"]);
  const unsupported = Object.keys(policy).filter(key => !allowed.has(key));
  if (unsupported.length) {
    throw new TypeError(`CjsResMan autoPurgePolicy does not support: ${unsupported.join(", ")}.`);
  }
  const intervalMilliseconds = policy.intervalMilliseconds ?? 1000;
  assertNonNegativeNumber(intervalMilliseconds, "autoPurgePolicy.intervalMilliseconds");
  for (const name of ["maxIdleMilliseconds", "payloadMaxIdleMilliseconds"]) {
    if (policy[name] !== undefined) {
      assertNonNegativeNumber(policy[name], `autoPurgePolicy.${name}`);
    }
  }
  if (policy.maxIdleMilliseconds === undefined && policy.payloadMaxIdleMilliseconds === undefined) {
    throw new TypeError("CjsResMan autoPurgePolicy requires an identity or payload inactivity limit.");
  }
  for (const name of ["destroyAdapters", "releasePayload"]) {
    if (policy[name] !== undefined && typeof policy[name] !== "boolean") {
      throw new TypeError(`CjsResMan autoPurgePolicy.${name} must be a boolean.`);
    }
  }
  if (policy.cleanup !== undefined && policy.cleanup !== false && typeof policy.cleanup !== "function") {
    throw new TypeError("CjsResMan autoPurgePolicy.cleanup must be a function or false.");
  }
  if (policy.now !== undefined && typeof policy.now !== "function") {
    throw new TypeError("CjsResMan autoPurgePolicy.now must be a function.");
  }
  return Object.freeze({
    intervalMilliseconds,
    maxIdleMilliseconds: policy.maxIdleMilliseconds,
    payloadMaxIdleMilliseconds: policy.payloadMaxIdleMilliseconds,
    destroyAdapters: policy.destroyAdapters ?? true,
    releasePayload: policy.releasePayload ?? true,
    ...(policy.cleanup === undefined ? {} : {
      cleanup: policy.cleanup
    }),
    now: policy.now || defaultAutoPurgeNow
  });
}

/**
 * Validate one automatic-purge pump request without advancing cadence.
 *
 * @param {CjsResManAutoPurgePumpOptions} options Per-call pump options.
 * @returns {CjsResManAutoPurgePumpOptions} Validated options.
 * @throws {TypeError} If options or an explicit timestamp are invalid.
 */
function normalizeAutoPurgePumpOptions(options) {
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("CjsResMan automatic purge options must be an object.");
  }
  const unsupported = Object.keys(options).filter(key => key !== "time");
  if (unsupported.length) {
    throw new TypeError(`CjsResMan automatic purge options do not support: ${unsupported.join(", ")}.`);
  }
  if (options.time !== undefined) {
    assertNonNegativeNumber(options.time, "automatic purge time");
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
function activeResourceOperationsError(activeOperations) {
  const error = new Error(`CjsResMan cannot replace MotherLode while ${activeOperations} resource operation(s) are active.`);
  error.code = "CJS_RESMAN_ACTIVE_RESOURCE_OPERATIONS";
  error.activeOperations = activeOperations;
  return error;
}

/**
 * Create the stable failure used when a manager-only load API receives a
 * resource that was never bound to this manager.
 *
 * @param {*} resource Candidate resource.
 * @param {string} phase Operation phase.
 * @returns {Error} Contextual ownership error.
 */
function resourceNotOwnedError(resource, phase) {
  const path = getResourceDiagnosticPath(resource);
  const error = new Error(`CjsResMan does not own a canonical resource at ${path}.`);
  error.code = "CJS_RESMAN_RESOURCE_NOT_OWNED";
  error.resource = resource;
  error.path = path;
  error.phase = phase;
  return error;
}

/**
 * Create the stable failure used when otherwise-successful obsolete work
 * reaches a canonical mutation boundary.
 *
 * @param {CjsResourceOwnership} ownership Captured stale authority.
 * @param {string} phase Operation phase that detected staleness.
 * @returns {Error} Contextual stale-operation error.
 */
function staleResourceOperationError(ownership, phase) {
  const path = getResourceDiagnosticPath(ownership?.resource);
  const error = new Error(`CjsResMan resource operation became stale during ${phase}: ${path}.`);
  error.code = "CJS_RESMAN_STALE_RESOURCE_OPERATION";
  error.resource = ownership?.resource || null;
  error.path = path;
  error.key = ownership?.key || null;
  error.generation = ownership?.generation || 0;
  error.phase = phase;
  return error;
}

/**
 * Reject a resource constructor that returns the protected canonical singleton
 * when a distinct reload candidate is required.
 *
 * @param {string} path Requested resource path.
 * @param {object|Function} resource Aliased canonical resource.
 * @returns {Error} Stable candidate-alias error.
 */
function reloadCandidateAliasError(path, resource) {
  const error = new Error(`CjsResMan reload candidate aliases the canonical resource: ${path}.`);
  error.code = "CJS_RESMAN_RELOAD_CANDIDATE_ALIAS";
  error.path = path;
  error.resource = resource;
  return error;
}

/**
 * Create the stable failure used when a candidate loader no longer has a
 * staged authority record.
 *
 * @param {object|Function} resource Candidate resource.
 * @returns {Error} Stable unavailable-candidate error.
 */
function reloadCandidateUnavailableError(resource) {
  const path = getResourceDiagnosticPath(resource);
  const error = new Error(`CjsResMan reload candidate is no longer available: ${path}.`);
  error.code = "CJS_RESMAN_RELOAD_CANDIDATE_UNAVAILABLE";
  error.path = path;
  error.resource = resource;
  return error;
}

/**
 * Create the stable failure used when a deleted, cleared, replaced, or
 * superseded reload candidate reaches a mutation or commit boundary.
 *
 * @param {CjsResourceReloadCandidate} candidate Captured candidate authority.
 * @param {string} phase Operation phase that detected staleness.
 * @returns {Error} Contextual stale-candidate error.
 */
function staleReloadCandidateError(candidate, phase) {
  const path = getResourceDiagnosticPath(candidate?.resource);
  const error = new Error(`CjsResMan reload candidate became stale during ${phase}: ${path}.`);
  error.code = "CJS_RESMAN_STALE_RELOAD_CANDIDATE";
  error.resource = candidate?.resource || null;
  error.expected = candidate?.expected || null;
  error.path = path;
  error.key = candidate?.key || null;
  error.generation = candidate?.generation || 0;
  error.phase = phase;
  return error;
}

/**
 * Read a resource path for diagnostics without allowing an unusual custom
 * resource getter to hide the primary ownership error.
 *
 * @param {*} resource Candidate resource.
 * @returns {string} Best-effort resource path label.
 */
function getResourceDiagnosticPath(resource) {
  try {
    return String(resource?.GetPath?.() || resource?.path || "<unknown>");
  } catch {
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
 * Validate a resource execution strategy.
 *
 * @param {*} loader Candidate loader.
 * @param {string} name Configuration field name.
 * @returns {void}
 */
function assertResourceLoader(loader, name) {
  if (!isResourceLoader(loader)) {
    throw new TypeError(`CjsResMan ${name} must provide Read and ReadFormat.`);
  }
}

/**
 * Test the structural resource loader contract.
 *
 * @param {*} loader Candidate loader.
 * @returns {boolean}
 */
function isResourceLoader(loader) {
  return Boolean(loader && typeof loader.Read === "function" && typeof loader.ReadFormat === "function");
}

/**
 * Merge frozen registration defaults with one request's format overrides.
 *
 * @param {object} descriptor Registered format descriptor.
 * @param {object} options Resource read options.
 * @returns {object} Effective format reader options.
 */
function createFormatReadOptions(descriptor, options) {
  const {
    Format,
    defaults
  } = descriptor;
  const formatOptions = {
    ...defaults,
    ...(options.formatOptions || {})
  };
  if (options.emit !== undefined) {
    formatOptions.emit = findDeclaredOutput(getFormatOutputs(Format), options.emit) ?? options.emit;
  }
  if (options.classes !== undefined) formatOptions.classes = options.classes;
  return formatOptions;
}

/**
 * Reports whether a source requires CjsResMan to build a URL before reading.
 *
 * @param {*} source Selected source/provider.
 * @returns {boolean}
 */
function sourceRequiresUrl(source) {
  return source?.requiresUrl === true || source?.constructor?.requiresUrl === true;
}

/**
 * Tests whether an object owns one property.
 *
 * @param {*} object Candidate object.
 * @param {string|number|symbol} property Property key.
 * @returns {boolean}
 */
function hasOwn(object, property) {
  return Object.prototype.hasOwnProperty.call(object, property);
}

/**
 * Normalizes one resource-path scheme key.
 *
 * @param {*} value Candidate scheme.
 * @returns {string}
 */
function normalizePathPrefix(value) {
  const prefix = String(value ?? "").trim().replace(/:\/?$/u, "").toLowerCase();
  if (!/^[a-z][a-z0-9+.-]*$/u.test(prefix)) {
    throw new TypeError("CjsResMan path prefixes must be URI scheme names.");
  }
  return prefix;
}

/**
 * Normalizes one registered URL base without altering case-sensitive path
 * content.
 *
 * @param {*} value Candidate URL base.
 * @returns {string}
 */
function normalizeUrlBase(value) {
  const url = normalizePath(value);
  if (!url || url.includes("\0")) {
    throw new TypeError("CjsResMan path URL bases must be non-empty strings.");
  }
  return url.endsWith("/") ? url : `${url}/`;
}

/**
 * Validates a URL returned by an injected path resolver.
 *
 * @param {*} value Resolver output.
 * @returns {string}
 */
function normalizeResolvedUrl(value) {
  const url = normalizePath(value);
  if (!url || url.includes("\0")) {
    throw new TypeError("CjsResMan pathResolver must return a non-empty URL string.");
  }
  return url;
}

/**
 * Return the wall-clock timestamp used by default automatic purge cadence.
 *
 * @returns {number} Milliseconds since the Unix epoch.
 */
function defaultAutoPurgeNow() {
  return Date.now();
}
function defaultQueueScheduler(callback) {
  return setTimeout(callback, 0);
}
function defaultQueueYield() {
  return new Promise(resolve => setTimeout(resolve, 0));
}
function normalizeRegistrationEntries(value, keyed = false) {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "function") return [value];
  if (typeof value !== "object") {
    throw new TypeError("CjsResMan registration collections must be arrays or objects.");
  }
  if (value.Format || value.format || value.Constructor || value.Resource || value.resourceType) {
    return [value];
  }
  return Object.entries(value).map(([key, entry]) => {
    if (!keyed) return typeof entry === "function" ? entry : {
      ...entry,
      key
    };
    return typeof entry === "function" ? {
      key,
      requirement: key,
      Constructor: entry
    } : {
      ...entry,
      key,
      requirement: entry.requirement || entry.payload || key
    };
  });
}

/** Normalize `Register({ extensions })` into extension/registration pairs. */
function normalizeExtensionRegistrationEntries(value) {
  if (value === null || value === undefined) return [];
  if (value instanceof Map) {
    return [...value.entries()].map(([ext, registration]) => [ext, normalizeExtensionRegistration(registration)]);
  }
  if (Array.isArray(value)) {
    return value.map((registration, index) => {
      if (!registration || typeof registration !== "object" || Array.isArray(registration)) {
        throw new TypeError(`CjsResMan extensions[${index}] must be an object.`);
      }
      const ext = registration.extension || registration.ext;
      if (!ext) {
        throw new TypeError(`CjsResMan extensions[${index}] requires extension or ext.`);
      }
      return [ext, normalizeExtensionRegistration(registration)];
    });
  }
  if (!value || typeof value !== "object") {
    throw new TypeError("CjsResMan extensions must be an object, Map, or array.");
  }
  return Object.entries(value).map(([ext, registration]) => [ext, normalizeExtensionRegistration(registration)]);
}
function normalizeExtensionRegistration(registration) {
  if (typeof registration === "function") return {
    Handler: registration
  };
  if (!registration || typeof registration !== "object" || Array.isArray(registration)) {
    throw new TypeError("CjsResMan extension registration must be a handler or object.");
  }
  return registration;
}
function normalizeExtensionRouteOptions(value) {
  if (typeof value === "function") return {
    Format: value
  };
  if (Array.isArray(value)) return {
    Formats: value
  };
  if (value === null || value === undefined) return {};
  if (!value || typeof value !== "object") {
    throw new TypeError("CjsResMan extension route must be a format, format array, or object.");
  }
  return value;
}
function createFormatDescriptor(Format, defaults = {}) {
  if (typeof Format !== "function") {
    throw new TypeError("CjsResMan format descriptor requires a format class.");
  }
  return Object.freeze({
    Format,
    defaults: snapshotFormatDefaults(defaults)
  });
}
function createExtensionFormatDescriptor(entry, defaults, label) {
  if (typeof entry === "function") return createFormatDescriptor(entry, defaults);
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new TypeError(`CjsResMan extension ${label} must be a format class or descriptor.`);
  }
  const Format = entry.Format || entry.format;
  return createFormatDescriptor(Format, entry.defaults === undefined ? defaults : entry.defaults);
}
function validateOrderedExtensionFormats(descriptors, ext) {
  for (let index = 0; index < descriptors.length - 1; index++) {
    const Format = descriptors[index].Format;
    if (typeof Format.isSupported !== "function") {
      throw new TypeError(`CjsResMan extension .${ext} format ${Format.name || index} has no support probe and must be last.`);
    }
  }
}
function assertExtensionTarget(Target, label) {
  if (typeof Target !== "function" || typeof Target.from !== "function" && typeof Target.fromYAML !== "function") {
    throw new TypeError(`CjsResMan extension ${label} must provide static from(values) or fromYAML(values, context).`);
  }
}
function createExtensionTargetError(resource, message, cause = null) {
  const path = getResourceDiagnosticPath(resource);
  const error = new Error(`CjsResMan extension target failed for ${path}: ${message}`, cause ? {
    cause
  } : undefined);
  error.code = "CJS_RESOURCE_EXTENSION_TARGET_FAILED";
  error.path = path;
  if (cause) error.cause = cause;
  return error;
}

export { CjsResMan };
//# sourceMappingURL=CjsResMan.js.map
