import {
  getResourceExtension,
  normalizeResourceExtension,
  normalizeResourcePath
} from "#utils/path";
import { CjsSchema, meta, type, blue } from "#schema";
import { CjsFormatRoute } from "./CjsFormatStore.js";
import { ResourceHandlerMode } from "../consts/resourceHandlerMode.js";

/**
 * Deterministic activity values accepted by resource-facing lease methods.
 *
 * @typedef {object} CjsResourceActivityOptions
 * @property {number} [frame] Explicit non-negative activity frame.
 * @property {number} [time] Explicit non-negative activity timestamp in milliseconds.
 */

/**
 * Manager-owned callbacks attached while a resource has canonical ownership,
 * and detached the moment it ends. The controller carries no load, fetch, or
 * prepare hook; recovery lives in the separate reload hook, which deliberately
 * outlives ownership because losing ownership is exactly when it is needed.
 *
 * @typedef {object} CjsResourceLifecycleController
 * @property {Function} [isCurrent] Tests exact canonical manager ownership without renewing activity.
 * @property {Function} [keepAlive] Renews canonical identity activity.
 * @property {Function} [keepPayloadAlive] Renews identity and CPU-payload activity.
 * @property {Function} [lock] Adds one inactivity-purge lock and returns its count.
 * @property {Function} [unlock] Releases one inactivity-purge lock and returns its count.
 */

/**
 * ResMan-owned runtime resource.
 *
 * Resources are not model graph objects: BLACK/RED graphs persist resource
 * paths (including empty paths), while CjsBlueResMan constructs, initializes,
 * caches, and hydrates the corresponding runtime resource instances.
 */
export class CjsResource
{
  _payload = null;

  /** Reloads attempted since the last successful load. */
  _reloadAttempts = 0;

  /**
   * The manager tick time at which this handle was last renewed by a plain
   * `KeepAlive()` (milliseconds, on the manager's MotherLode clock). The
   * MotherLode folds it into its record when it next sweeps; see
   * {@link CjsResource#KeepAlive}.
   */
  _lastUsedTime = 0;

  /**
   * Notify targets waiting for this resource to finish (Carbon
   * `m_reloadNotifyTargets`), each with `RebuildCachedData(resource)` and
   * `ReleaseCachedData(resource)`. Emptied on every completion: see
   * {@link CjsResource#AddNotifyTarget}.
   */
  _notifyTargets = [];

  /**
   * How many times a purged or failed resource reloads itself before giving up.
   *
   * Per class so a subclass can be more or less patient. Counted per resource
   * and reset on every successful load, so this bounds consecutive failures,
   * not the lifetime total.
   */
  static maxReloadAttempts = 3;

  /**
   * The current manager tick's time, stamped once per `CjsBlueResMan.Update`
   * (milliseconds, MotherLode clock). Zero until the manager first ticks.
   */
  static activityTime = 0;

  /**
   * Logical source path assigned by Initialize and returned by GetPath.
   * Resource-path normalization preserves the payload portion of dynamic paths.
   * @type {string}
   */
  path = "";

  /**
   * Resource extension without its leading dot, used to resolve format routes.
   * Initialize derives it from path or normalizes an explicit override; empty when absent.
   * @type {string}
   */
  ext = "";

  /**
   * Requested semantic resource kind used by CjsBlueResMan to select a resource
   * class. Initialize trims and lowercases it; an empty string leaves it unspecified.
   * @type {string}
   */
  requirement = "";

  /**
   * `m_isUrgent` (BlueAsyncRes.h): whether the manager was in urgent mode when this
   * resource was created; its load and prepare are then queued urgent, ahead of
   * every regular entry (BlueAsyncRes.cpp:108-111, :217-226).
   * @type {boolean}
   */
  isUrgent = false;

  /**
   * Current JavaScript load/preparation phase from CjsResource.State.
   * SetState publishes state-change events; Initialize resets it to EMPTY.
   * @type {string}
   */
  state = CjsResource.State.EMPTY;

  /**
   * Identifies this class as a runtime resource.
   *
   * Static, so a schema field declared as `@type.rootRef("TriGeometryRes")`
   * can be known to hold a resource without an instance existing - the
   * declaration alone is enough, resolved through `CjsSchema.getConstructor`.
   */
  static isResource = true;

  /** Declares that extension routes using this handler publish the resource. */
  static handlerMode = ResourceHandlerMode.RESOURCE;

  /** Identifies this handle as a runtime resource. */
  get isResource() {
    return this.constructor.isResource === true;
  }

  /**
   * Create a detached runtime resource with empty identity and payload state.
   * Schema values are applied without attaching manager lifecycle callbacks;
   * CjsBlueResMan supplies those callbacks after canonical insertion.
   *
   * @param {object|null} [values=null] Initial decorated schema-field values.
   */
  constructor(values = null) {
    Object.defineProperty(this, "__adapterResources", {
      value: Object.create(null),
      enumerable: false,
      configurable: true,
      writable: true
    });
    Object.defineProperty(this, "__formatStore", {
      value: null,
      enumerable: false,
      configurable: true,
      writable: true
    });
    Object.defineProperty(this, "__objectLoader", {
      value: null,
      enumerable: false,
      configurable: true,
      writable: true
    });
    Object.defineProperty(this, "__objectRequest", {
      value: null,
      enumerable: false,
      configurable: true,
      writable: true
    });
    Object.defineProperty(this, "__lifecycleController", {
      value: null,
      enumerable: false,
      configurable: true,
      writable: true
    });
    Object.defineProperty(this, "__reloadHook", {
      value: null,
      enumerable: false,
      configurable: true,
      writable: true
    });
    if (values)
    {
      this.SetValues(values);
    }
  }

  /**
   * Apply resource identity or metadata values without model graph semantics.
   *
   * @param {object|null} values
   * @returns {CjsResource}
   */
  SetValues(values = null) {
    if (!values || typeof values !== "object") return this;
    const fields = CjsSchema.getSchema(this.constructor).fields;
    for (const field of fields) {
      if (field.type?.runtimeOnly === true) continue;
      if (Object.prototype.hasOwnProperty.call(values, field.name)) {
        this[field.name] = values[field.name];
      }
    }
    return this;
  }

  /**
   * Export resource identity and schema metadata. Runtime state is not a model
   * graph node; graph fields normally persist only their resource path.
   *
   * @returns {object}
   */
  GetValues() {
    const result = {};
    for (const field of CjsSchema.getSchema(this.constructor).fields) {
      if (field.type?.runtimeOnly === true) continue;
      result[field.name] = this[field.name];
    }
    return result;
  }

  /**
   * `IBlueResource::Initialize` (`blue/include/IBlueResource.h:14`): sets the
   * resource identity from a path and optional extension.
   *
   * Adapted: adds a third `requirement` argument, the lowercase semantic
   * outcome the caller asked for, which selects the resource class
   * (`CjsBlueResMan.RegisterResourceType`); it also resets state and error and
   * returns this resource, where Carbon's returns void.
   *
   * @param {string} path Resource path.
   * @param {string|null} [ext] Extension override; derived from the path when absent.
   * @param {string|null} [requirement] Semantic requirement; normalized to lowercase.
   * @returns {CjsResource} This resource.
   */
  Initialize(path, ext = null, requirement = "") {
    this.path = normalizeResourcePath(path);
    this.ext = ext ? normalizeResourceExtension(ext) : getResourceExtension(this.path);
    this.requirement = requirement === null || requirement === undefined
      ? ""
      : String(requirement).trim().toLowerCase();
    this.state = CjsResource.State.EMPTY;
    this.error = null;
    return this;
  }

  /**
   * Get the normalized resource path.
   *
   * @returns {string}
   */
  GetPath() {
    return this.path;
  }

  /**
   * Get the normalized resource extension.
   *
   * @returns {string}
   */
  GetExt() {
    return this.ext;
  }

  /**
   * Return the normalized semantic outcome requested from this source path.
   * This metadata query is pure and does not renew manager activity.
   *
   * @returns {string} Lowercase requirement name, or an empty string.
   */
  GetRequirement() {
    return this.requirement;
  }

  /**
   * Return true when the resource is currently loading.
   *
   * @returns {boolean}
   */
  IsLoading() {
    return this.state === CjsResource.State.REQUESTED || this.state === CjsResource.State.LOADING;
  }

  /**
   * Return true when CPU resource payload data has been loaded.
   *
   * @returns {boolean}
   */
  HasLoaded() {
    return this.state === CjsResource.State.LOADED
      || this.state === CjsResource.State.PREPARING
      || this.state === CjsResource.State.PREPARED;
  }

  /**
   * Return true when preparation has completed or produced a good resource.
   *
   * @returns {boolean}
   */
  IsPrepared() {
    return this.state === CjsResource.State.PREPARED;
  }

  /**
   * Return true when this resource finished trying to load, either way.
   *
   * Completion is also when waiting notify targets are told. Carbon's
   * `m_isPrepared` is set on the failure path too (`BlueAsyncRes.cpp:183`), so
   * `IsPrepared()` there means "finished trying", while ours keeps the narrower
   * "succeeded".
   *
   * `PURGED` is not completion: nothing was tried and nothing concluded, the
   * payload was simply taken away.
   *
   * @returns {boolean}
   */
  HasCompleted() {
    return this.state === CjsResource.State.PREPARED
      || this.state === CjsResource.State.FAILED;
  }

  /**
   * Return true when preparation completed successfully, and renew this
   * resource.
   *
   * Every caller of `IsGood()` is about to use the resource, so renewal always
   * follows the query. Merging them - as ccpwgl does in `Tw2Resource.js:108` -
   * closes that gap permanently instead of relying on call-site discipline, and
   * means a purged resource reloads itself the moment anything asks for it.
   *
   * @returns {boolean}
   */
  IsGood() {
    this.KeepAlive();
    return this.IsPrepared();
  }

  /**
   * Return true when preparation failed.
   *
   * @returns {boolean}
   */
  IsFailed() {
    return this.state === CjsResource.State.FAILED;
  }

  /**
   * Changes state and emits the state-specific and statechange events; on
   * reaching a load outcome it tells the waiting notify targets.
   */
  SetState(state, ...details) {
    if (!CjsResource.isValidState(state)) {
      throw new TypeError(`Invalid CjsResource state: ${state}`);
    }
    const previous = this.state;
    if (previous === state) return this;
    if (previous === CjsResource.State.FAILED && CjsResource.isLateResultState(state))
    {
      this.RecordLateResult(state);
      return this;
    }
    this.state = state;
    // A successful load clears the budget, so the cap bounds consecutive
    // failures rather than how many times a resource may ever be purged.
    if (state === CjsResource.State.PREPARED) this._reloadAttempts = 0;
    this.EmitEvent(state, this, ...details);
    this.EmitEvent("statechange", this, state, previous);
    // Waiting notify targets hear the outcome once and are released; after a
    // purge and reload, owners that asked IsGood() meanwhile hear it again.
    if (this.HasCompleted())
    {
      this.NotifyRebuildCachedData();
    }
    else if (state === CjsResource.State.PURGED)
    {
      this.NotifyReleaseCachedData();
    }
    return this;
  }

  /**
   * Register a notify target (BlueAsyncRes.cpp:261-290), to be told once, when
   * this resource next finishes: `RebuildCachedData(this)` on `PREPARED` or
   * `FAILED`, after which the target is no longer held.
   *
   * Adapted: Carbon keeps a target until its owner calls `RemoveNotifyTarget`,
   * which every C++ owner does from its destructor. JavaScript has no
   * destructor, so a kept target would hold its owner for as long as the
   * resource lives - and cached resources live as long as the manager. Instead
   * the link is released on completion, and an owner that needs to hear about a
   * later reload asks again: it calls `IsGood()` before use, and while that is
   * false and the resource has not failed, it re-registers.
   *
   * A resource that has already finished calls `RebuildCachedData` at once and
   * stores nothing, as Carbon's immediate call does (`:274-277`). A duplicate
   * registration is ignored rather than asserted, because owners re-register
   * every frame while a resource is pending.
   *
   * @param {{RebuildCachedData: Function, ReleaseCachedData: Function}} target Notify target.
   * @returns {CjsResource} This resource.
   */
  AddNotifyTarget(target)
  {
    if (this.HasCompleted())
    {
      target.RebuildCachedData(this);
      return this;
    }
    if (!this._notifyTargets.includes(target)) this._notifyTargets.push(target);
    return this;
  }

  /**
   * Remove a notify target that is still waiting (BlueAsyncRes.cpp:292-334).
   * Removing one that was already told, or never added, does nothing.
   *
   * @param {object} target Notify target previously added.
   * @returns {CjsResource} This resource.
   */
  RemoveNotifyTarget(target)
  {
    const index = this._notifyTargets.indexOf(target);
    if (index >= 0) this._notifyTargets.splice(index, 1);
    return this;
  }

  /**
   * Call `RebuildCachedData` on every waiting notify target, and release them
   * (BlueAsyncRes.cpp:354-360). The list is replaced before any target runs, so
   * a target that re-registers from inside its own call is kept for the next
   * completion rather than lost.
   *
   * @returns {CjsResource} This resource.
   */
  NotifyRebuildCachedData()
  {
    const targets = this._notifyTargets;
    if (!targets.length) return this;
    this._notifyTargets = [];
    for (const target of targets) target.RebuildCachedData(this);
    return this;
  }

  /**
   * Call `ReleaseCachedData` on every waiting notify target
   * (BlueAsyncRes.cpp:362-368). They stay registered, so the reload that follows
   * rebuilds them.
   *
   * Carbon releases only from `Reload()`, because it never drops a resource
   * that is still referenced. This runtime purges on inactivity while owners
   * may still hold the handle, so a purge releases too. Targets are released on
   * completion and a resource is purged only after completing, so this normally
   * finds nobody; owners learn of a purge from `IsGood()` instead.
   *
   * @returns {CjsResource} This resource.
   */
  NotifyReleaseCachedData()
  {
    for (const target of this._notifyTargets.slice()) target.ReleaseCachedData(this);
    return this;
  }

  /** Marks this resource as requested. */
  MarkRequested() {
    return this.SetState(CjsResource.State.REQUESTED);
  }

  /** Marks this resource as actively loading. */
  MarkLoading() {
    return this.SetState(CjsResource.State.LOADING);
  }

  /** Marks this resource's CPU payload as loaded. */
  MarkLoaded() {
    return this.SetState(CjsResource.State.LOADED);
  }

  /** Marks this resource as preparing its semantic result. */
  MarkPreparing() {
    return this.SetState(CjsResource.State.PREPARING);
  }

  /** Marks this resource as successfully prepared. */
  MarkPrepared() {
    return this.SetState(CjsResource.State.PREPARED);
  }

  /** Marks this resource as successfully prepared. */
  MarkGood() {
    return this.MarkPrepared();
  }

  /**
   * Mark this detached resource handle as purged after a successful
   * manager-owned policy eviction, such as inactivity or recorded-byte cache
   * pressure, released its adapter allocations and payload.
   *
   * @returns {CjsResource} This purged resource.
   */
  MarkPurged()
  {
    return this.SetState(CjsResource.State.PURGED);
  }

  /**
   * Return whether deterministic manager cleanup has purged this handle.
   * This is a pure state query and never renews resource activity.
   *
   * @returns {boolean} `true` when the current state is `PURGED`.
   */
  IsPurged()
  {
    return this.state === CjsResource.State.PURGED;
  }

  /**
   * Record a load result that arrived after this resource had already failed -
   * a stub filled in after the watch's stall check failed it, say - and ignore
   * it: the resource stays FAILED and not good.
   *
   * Ours (operator, 2026-10-04: late results are errors, so they can be
   * tracked). Accepting it would reach nobody: owners stop re-registering once a
   * resource fails, because registering on a finished resource calls back at
   * once. Retrying is the deliberate `ResetReloadAttempts()` plus `Reload()`.
   * The new error is `CJS_RESOURCE_COMPLETED_AFTER_FAILURE`, with the original
   * failure as its cause. A payload stored by `SetPayload` before the state
   * change stays, unused.
   *
   * @param {string} state The result state that was refused.
   * @returns {CjsResource} This resource.
   */
  RecordLateResult(state)
  {
    const error = new Error(`Resource reached "${state}" after it had failed; the late result is ignored (${this.path}).`);
    error.code = "CJS_RESOURCE_COMPLETED_AFTER_FAILURE";
    error.path = this.path;
    error.cause = this.error;
    this.error = error;
    this.EmitEvent("lateresult", this, error);
    return this;
  }

  /** Stores a load failure and marks this resource as failed. */
  SetError(error) {
    this.error = error || null;
    return this.SetState(CjsResource.State.FAILED, this.error);
  }

  /**
   * Store the plain CPU payload associated with this resource.
   * Concrete resource classes validate the fields they require before calling
   * this method. If the compatibility `object` property still aliases the
   * previous payload, it is updated to the replacement; semantic resources
   * whose `object` points to the resource itself are unaffected. A non-null
   * payload explicitly renews its manager-owned identity and payload leases;
   * payload reads remain pure and do not renew either lease.
   *
   * @param {*} payload Plain reader/converter output, or `null` to clear it.
   * @returns {CjsResource} This resource with the supplied payload reference.
   */
  SetPayload(payload = null) {
    const previous = this._payload;
    this._payload = payload;
    if (this.object === previous) this.object = payload;
    if (this.HasPayload()) this.KeepPayloadAlive();
    return this;
  }

  /**
   * Take over loading entirely, before the manager fetches anything.
   *
   * Returning `true` means this resource handled its own acquisition and the
   * manager stands down: no fetch, no queue entry. Returning `false` — the
   * default — means load it the ordinary way.
   *
   * This one is optional, so it has a default. Most resources never take it.
   * Declaring it here
   * rather than optional-chaining at the call site keeps the caller honest:
   * absence is a supported answer, so the base states the answer.
   *
   * @param {string} url Resolved source url.
   * @param {string} extension Lowercased extension including its dot.
   * @returns {boolean} Whether this resource handled its own load.
   */
  DoCustomLoad(url, extension) {
    return false;
  }

  /**
   * Bind the format store this resource may resolve its own reader from.
   *
   * A resource must not import its formats - every one of them is a
   * tree-shakeable subpath, so importing one here would drag it into every
   * consumer of this resource. Nor can it hardcode a list, because which
   * formats exist is a property of the composed application. The store is the
   * link that lets both stay true: the composition root registers what it
   * wants, and the resource asks.
   *
   * Optional. A resource loaded through `CjsBlueResMan` never needs it, because the
   * manager resolves the reader from its own extension routes and hands the
   * outcome over as a payload. This is for the resource driving its own load.
   *
   * @param {import("./format/CjsFormatStore.js").CjsFormatStore|null} store
   * @returns {CjsResource} This resource.
   */
  SetFormatStore(store = null) {
    this.__formatStore = store;
    return this;
  }

  /** The bound format store, or `null`. */
  GetFormatStore() {
    return this.__formatStore || null;
  }

  /**
   * The route that should read this resource's source data.
   *
   * An explicitly supplied format always wins: a caller naming a reader knows
   * something the extension does not. It is wrapped in a route so callers have
   * one shape to handle either way.
   *
   * Otherwise the bound store answers from this resource's own extension, and
   * from an `output` only when the caller asks for one.
   *
   * `requirement` IS NOT THE OUTPUT, though it reads like it. It selects the
   * resource class — `CjsBlueResMan.RegisterResourceType` keys on it. A format's
   * outputs are a different axis entirely: `texture` and `rgba` are two
   * representations of one DDS. Conflating them makes a resource loaded with
   * `requirement: "geometry"` filter for routes declaring an output named
   * `geometry`, find none, and resolve to null.
   *
   * Returns `null` when nothing answers, so the caller reports what it could
   * not read rather than handing bytes to a reader that never claimed them.
   *
   * @param {*} [data] Source data, used to separate routes sharing an extension.
   * @param {object|null} [options] May carry an explicit `format`, `read` and `output`.
   * @returns {import("./format/CjsFormatStore.js").CjsFormatRoute|null}
   */
  ResolveFormat(data, options = null) {
    if (options?.format) {
      return new CjsFormatRoute(options.format, {
        read: options.read,
        output: options.output || null
      });
    }
    return this.GetFormatStore()?.Resolve(this.ext, data, {
      output: options?.output || null
    }) || null;
  }

  /**
   * How this resource wants its source bytes delivered.
   *
   * The manager must fetch before it knows the format, so the resource states
   * what shape it needs. Defaults to the format-side default, which is what
   * every transport hardcodes today.
   *
   * @returns {string} A fetch response type.
   */
  GetRequestResponseType() {
    return "arraybuffer";
  }

  /**
   * Turn raw source bytes into this resource.
   *
   * Carbon's concrete default, `virtual LoadingResult DoLoad() { return
   * LR_FAILED; }` (BlueAsyncRes.h:112): a resource that does not load itself
   * fails its load. Not abstract (operator ruling, 2026-10-17).
   *
   * Adapted: the bytes arrive as `data` because the browser's fetch is
   * asynchronous and the manager reads before it knows the format, where
   * Carbon's DoLoad opens its own stream. The loading subclasses
   * (`Tr2EffectRes`, `TriTextureRes`, `Tr2GrannyStateRes`) return
   * themselves instead of a `LoadingResult`.
   *
   * @param {ArrayBuffer|ArrayBufferView|string} _data Raw source data.
   * @param {object|null} [_options] Model values applied after the read.
   * @returns {number} `CjsResource.LoadingResult.LR_FAILED`.
   */
  DoLoad(_data, _options = null) {
    return CjsResource.LoadingResult.LR_FAILED;
  }

  /**
   * Read the plain CPU payload associated with this resource.
   *
   * The query is pure and does not renew the payload lease.
   *
   * @returns {*} Current payload reference, or `null` after release.
   */
  GetPayload() {
    return this._payload;
  }

  /**
   * Return whether a payload has been explicitly assigned. This query is pure
   * and does not renew the payload lease.
   *
   * @returns {boolean} Whether a non-null payload is attached.
   */
  HasPayload() {
    return this._payload !== null && this._payload !== undefined;
  }

  /**
   * Release the complete payload reference after consumers have retained the
   * scalars and typed-array views they require. When the compatibility
   * `object` property still aliases that exact payload, it is cleared as part
   * of the same ownership release. Semantic resources whose `object` property
   * points to the resource itself are unaffected.
   *
   * @returns {CjsResource} This resource without its former payload reference.
   */
  ReleasePayload() {
    const payload = this._payload;
    this._payload = null;
    if (this.object === payload) this.object = null;
    return this;
  }

  /**
   * Bind or detach the manager callbacks used by explicit resource-facing
   * liveness operations. Runtime resources remain usable when unbound; their
   * liveness methods then become deterministic no-ops.
   *
   * @param {CjsResourceLifecycleController|null} controller Manager callbacks, or `null` after canonical ownership ends.
   * @returns {CjsResource} This resource.
   * @throws {TypeError} If the controller or any supplied callback is invalid.
   */
  SetLifecycleController(controller = null)
  {
    if (controller !== null && (typeof controller !== "object" || Array.isArray(controller)))
    {
      throw new TypeError("CjsResource lifecycle controller must be an object or null.");
    }
    for (const name of [ "isCurrent", "keepAlive", "keepPayloadAlive", "lock", "unlock" ])
    {
      if (controller?.[name] !== undefined && typeof controller[name] !== "function")
      {
        throw new TypeError(`CjsResource lifecycle controller ${name} must be a function.`);
      }
    }
    this.__lifecycleController = controller;
    return this;
  }

  /**
   * Return whether this handle is still the manager's canonical resource.
   *
   * Engine adapters use this immediately before synchronously attaching a
   * completed backend candidate. Detached resources return `false`; the query
   * never renews activity, reloads data, or mutates lifecycle state.
   *
   * @returns {boolean} Whether the bound manager still owns this exact handle.
   */
  IsCurrent()
  {
    return Boolean(this.__lifecycleController?.isCurrent());
  }

  /**
   * Renew this resource's canonical identity activity, and reload it when
   * it has been purged.
   *
   * Purge is deletion - the payload is gone and nothing restores it - so
   * revival is an ordinary reload along the first-load path. Consumers
   * therefore never have to know a purge happened: they ask for what they need
   * and this makes it be there.
   *
   * `IsGood()` calls this, so most callers never invoke it directly.
   *
   * A plain call, once the manager has ticked, is one field write: the tick's
   * time goes into `_lastUsedTime`, and the MotherLode folds it into its record
   * when it next sweeps (`CjsMotherLode._SettleRenewals`). Every draw path asks
   * `IsGood()` each frame, and renewing through the manager cost about 100-170
   * ns a call against about 0.5 ns for the stamp (measured 2026-10-04). This is
   * the July 2026 plan: activity tracked on the resource, ccpwgl's
   * `activeFrame`, in milliseconds. A call with explicit options, or before
   * the first tick, renews through the manager as before.
   *
   * @param {CjsResourceActivityOptions} [options] Optional deterministic activity values.
   * @returns {CjsResource} This resource, whether bound or detached.
   * @throws {TypeError} If the bound manager rejects invalid activity values.
   */
  KeepAlive(options = undefined)
  {
    if (options === undefined && CjsResource.activityTime > 0) this._lastUsedTime = CjsResource.activityTime;
    else this.__lifecycleController?.keepAlive(options ?? {});
    if (this.IsPurged()) this.Reload(options ?? {});
    return this;
  }

  /**
   * Re-register this handle with its manager and reload it into itself.
   *
   * Runs only from `PURGED` or `FAILED` - the two states where the payload is
   * absent but recoverable. It does nothing to a resource that is loaded or
   * still loading, so it is not a way to force a refetch of something already
   * there.
   *
   * Bounded by `maxReloadAttempts`, because `KeepAlive()` calls this and the
   * render path calls that every frame: without a cap, one missing texture
   * becomes a permanent retry storm against the thing least likely to succeed.
   * Attempts are spaced by real load round-trips rather than frames - starting
   * one leaves `PURGED`/`FAILED`, so nothing re-enters until it settles - and
   * the count resets on any successful load.
   *
   * The distinction that matters: the reload must fill THIS handle, not resolve
   * whatever the manager currently caches for the same path. A consumer holding
   * a purged handle has no way to discover a replacement, so handing it a fresh
   * instance elsewhere leaves it dead forever.
   *
   * Detached handles have no manager to re-register with and stay as they are.
   *
   * @param {CjsResourceActivityOptions} [options={}] Optional deterministic activity values.
   * @returns {boolean} Whether a reload was started.
   */
  Reload(options = {})
  {
    if (!this.IsPurged() && !this.IsFailed()) return false;
    if (this._reloadAttempts >= this.constructor.maxReloadAttempts) return false;
    if (typeof this.__reloadHook !== "function") return false;

    this._reloadAttempts += 1;
    return this.__reloadHook(options) !== false;
  }

  /**
   * Bind the manager callback that restores this handle after it loses its
   * payload.
   *
   * Deliberately separate from the lifecycle controller, which is detached the
   * moment canonical ownership ends. Recovery has to survive exactly that
   * event: a purged handle with no route back to its manager is unrecoverable,
   * which is the failure this whole contract exists to prevent.
   *
   * @param {Function|null} hook Manager callback, or `null` to detach it.
   * @returns {CjsResource} This resource.
   * @throws {TypeError} If the hook is neither a function nor null.
   */
  SetReloadHook(hook = null)
  {
    if (hook !== null && typeof hook !== "function")
    {
      throw new TypeError("CjsResource.SetReloadHook requires a function or null.");
    }
    this.__reloadHook = hook;
    return this;
  }

  /**
   * Return how many reloads have been attempted since the last successful load.
   *
   * @returns {number}
   */
  GetReloadAttempts()
  {
    return this._reloadAttempts;
  }

  /**
   * Clear the reload attempt count, so a resource that exhausted its attempts
   * can be asked again.
   *
   * This is the deliberate "try it again" gesture - a user retrying a failed
   * load, say. It is separate from `Reload()` because the cap exists precisely
   * to stop the automatic path retrying forever, so lifting it has to be a
   * decision someone made.
   *
   * @returns {CjsResource} This resource.
   */
  ResetReloadAttempts()
  {
    this._reloadAttempts = 0;
    return this;
  }

  /**
   * Explicitly renew both canonical identity activity and the attached CPU
   * payload lease. Reading the payload through `GetPayload()` or
   * `HasPayload()` remains pure.
   *
   * @param {CjsResourceActivityOptions} [options={}] Optional deterministic activity values.
   * @returns {CjsResource} This resource, whether a payload exists or not.
   * @throws {TypeError} If the bound manager rejects invalid activity values.
   */
  KeepPayloadAlive(options = {})
  {
    this.__lifecycleController?.keepPayloadAlive(options);
    return this;
  }

  /**
   * Add one explicit purge lock through the bound manager and renew identity
   * activity. Locking never reloads or prepares a resource.
   *
   * @returns {number} New lock count, or `0` when this resource is detached.
   */
  Lock()
  {
    return this.__lifecycleController?.lock() || 0;
  }

  /**
   * Release one explicit purge lock without allowing the count to underflow.
   * Unlocking does not immediately purge or release a payload.
   *
   * @returns {number} Remaining lock count, or `0` when detached or unlocked.
   */
  Unlock()
  {
    return this.__lifecycleController?.unlock() || 0;
  }

  /**
   * Bind the manager-owned object operation and compact reconstruction request
   * for this shared resource handle. The request contains source provenance
   * and requested-output defaults, not reader implementations or registry
   * history.
   *
   * @param {Function|null} loader Manager callback, or `null` to detach it.
   * @param {object|null} [request=null] Compact reconstruction defaults retained with the handle.
   * @returns {CjsResource} This resource with the supplied loader binding.
   * @throws {TypeError} If the loader or reconstruction request is invalid.
   */
  SetObjectLoader(loader = null, request = null)
  {
    if (loader !== null && typeof loader !== "function")
    {
      throw new TypeError("CjsResource.SetObjectLoader requires a function or null.");
    }
    if (request !== null && (!request || typeof request !== "object" || Array.isArray(request)))
    {
      throw new TypeError("CjsResource.SetObjectLoader request must be an object or null.");
    }
    this.__objectLoader = loader;
    this.__objectRequest = request === null ? null : { ...request };
    return this;
  }

  /**
   * Return the compact manager request retained for explicit reconstruction.
   * This query is pure and exposes no reader, constructor, or implementation
   * identity.
   *
   * @returns {Readonly<object>|null} Frozen reconstruction defaults, or `null` when unbound.
   */
  GetObjectRequest()
  {
    return this.__objectRequest;
  }

  /**
   * Return the manager-owned object outcome for this resource identity.
   * Concurrent callers share one in-flight operation. A resident payload is
   * returned without source work; after explicit payload release, this call is
   * an explicit reconstruction request and may load/prepare through the bound
   * manager. This loader resolves the manager's current canonical identity, so
   * on a purged handle it may answer with a different instance - use
   * `KeepAlive()`/`Reload()` to revive this handle itself.
   *
   * Promised-output fields retained by the handle take precedence over fields
   * supplied here; operation policy such as cache/reload controls may still be
   * overridden.
   *
   * @param {object} [options={}] Source, format, semantic outcome, and queue options forwarded to the manager.
   * @returns {Promise<*>} In-flight, resident, or reconstructed object outcome.
   */
  GetObject(options = {})
  {
    if (!this.__objectLoader)
    {
      const error = new Error(`Resource has no object loader: ${this.path}`);
      error.code = "CJS_RESOURCE_LOADER_UNBOUND";
      return Promise.reject(error);
    }
    return this.__objectLoader(options);
  }

  /**
   * Promise-shaped alias for {@link CjsResource#GetObject}. Readiness shares an
   * in-flight operation, returns resident payload without loading, and treats a
   * call after payload release as an explicit reconstruction request.
   *
   * @param {object} [options={}] Source, format, semantic outcome, and queue options forwarded to the manager.
   * @returns {Promise<*>} In-flight, resident, or reconstructed object outcome.
   */
  Ready(options = {})
  {
    return this.GetObject(options);
  }

  /**
   * Attach an opaque engine-owned resource object.
   *
   * Runtime-resource stores this value but does not inspect GPU APIs.
   *
   * @param {string} key
   * @param {*} value
   * @returns {CjsResource}
   */
  SetAdapterResource(key, value) {
    if (!key) throw new TypeError("CjsResource.SetAdapterResource requires a key.");
    this.__adapterResources[String(key)] = value;
    return this;
  }

  /**
   * Get an opaque engine-owned resource object.
   *
   * @param {string} key
   * @returns {*}
   */
  GetAdapterResource(key) {
    return this.__adapterResources[String(key)] ?? null;
  }

  /**
   * Returns true when an adapter resource exists for the given key.
   *
   * @param {string} key
   * @returns {boolean}
   */
  HasAdapterResource(key) {
    return Object.prototype.hasOwnProperty.call(this.__adapterResources, String(key));
  }

  /**
   * Remove an adapter resource and optionally call its destroy/dispose method.
   *
   * @param {string} key
   * @param {object} options
   * @returns {CjsResource}
   */
  DestroyAdapterResource(key, options = {}) {
    const name = String(key);
    const value = this.__adapterResources[name];
    if (value && options.destroy !== false) {
      destroyAdapterValue(value);
    }
    delete this.__adapterResources[name];
    return this;
  }

  /**
   * Remove the opaque slots registered through SetAdapterResource.
   *
   * Custom: this JS adapter registry has no Carbon counterpart. Carbon releases
   * texture and mesh allocations on their owning resources, so their JS
   * ReleaseResources/ReleasePayload paths retain that ownership. This method
   * visits only __adapterResources: it does not release TriTextureRes.texture,
   * loadedBitmap, or geometry LOD allocations. Full cache cleanup invokes both
   * this method and the resource's ReleasePayload.
   *
   * Teardown delegates to destroyAdapterValue, which selects the first truthy
   * Destroy, Dispose, destroy, or dispose member and calls it when callable.
   * Passing destroy: false removes the slots without calling teardown.
   *
   * @param {object} [options={}] Adapter teardown options.
   * @param {boolean} [options.destroy=true] Whether to call registered teardown.
   * @returns {CjsResource} This resource after removing the slots.
   */
  DestroyAdapterResources(options = {}) {
    for (const key of Object.keys(this.__adapterResources)) {
      this.DestroyAdapterResource(key, options);
    }
    return this;
  }

  /** Carbon's `BlueAsyncRes::LoadingResult` (BlueAsyncRes.h:106-109): what a `DoLoad` returns. */
  static LoadingResult = Object.freeze({
    LR_FAILED: 0,
    LR_SUCCESS: 1,
    LR_SUCCESS_DONTNOTIFY: 2
  });

  /**
   * Frozen JavaScript lifecycle vocabulary used by state predicates and
   * SetState validation. Values also name the corresponding resource events.
   * @type {Readonly<Record<string, string>>}
   */
  static State = Object.freeze({
    EMPTY: "empty",
    REQUESTED: "requested",
    LOADING: "loading",
    LOADED: "loaded",
    PREPARING: "preparing",
    PREPARED: "prepared",
    FAILED: "failed",
    UNLOADED: "unloaded",
    PURGED: "purged"
  });

  /**
   * Whether a state is a load result - the outcome of a load in flight - rather
   * than the start of one. A FAILED resource leaves FAILED only by starting a new
   * load (REQUESTED or LOADING, as `Reload()` does).
   */
  static isLateResultState(state)
  {
    return state === CjsResource.State.LOADED
      || state === CjsResource.State.PREPARING
      || state === CjsResource.State.PREPARED;
  }

  /** Returns true when a value belongs to the resource state vocabulary. */
  static isValidState(state)
  {
    return Object.values(CjsResource.State).includes(state);
  }

  /**
   * Returns true when a resource state cannot continue its current operation.
   *
   * `PURGED` is deliberately absent: a purged resource reloads itself
   * through `KeepAlive()`, so purge is a transition out of a settled state
   * rather than a resting place.
   */
  static isTerminalState(state)
  {
    return state === CjsResource.State.PREPARED
      || state === CjsResource.State.FAILED
      || state === CjsResource.State.UNLOADED;
  }
}

// The notify surface arrives by composition rather than `extends
// CjsEventEmitter`, keeping the inheritance slot free. Functional form, not
// decorator syntax, for the same reason the schema below is data: the resource
// tree stays plain ESM that loads from source without a transform.
meta.events(CjsResource);

// Declared as data rather than with decorators, so the resource tree stays
// plain ESM that loads from source without a transform. Resources are not model
// graph nodes - there is no Copy or Clone here, and SetValues/GetValues are a
// flat schema-driven property copy - so nothing here needed the decorator form.
// Field order is key order, and GetValues() exports in that order.
CjsSchema.meta.define(CjsResource, {
  className: "CjsResource",
  donors: [ "BlueAsyncRes" ],
  fields: {
    path: type.path,
    ext: type.string,
    requirement: type.string,
    state: type.string
  },
  methods: {
    DoLoad: [ blue.method, meta.adapted ],
    Reload: [ blue.method, meta.adapted ],
    Initialize: [ blue.method, meta.adapted ],
    GetPath: [ blue.method, meta.adapted ],
    GetExt: [ blue.method, meta.adapted ],
    IsLoading: [ blue.method, meta.adapted ],
    HasLoaded: [ meta.adapted ],
    IsPrepared: [ blue.method, meta.adapted ],
    IsGood: [ blue.method, meta.adapted ],
    IsFailed: [ meta.adapted ],
    AddNotifyTarget: [ blue.method, meta.adapted ],
    RemoveNotifyTarget: [ blue.method, meta.implemented ],
    NotifyRebuildCachedData: [ blue.method, meta.adapted ],
    NotifyReleaseCachedData: [ blue.method, meta.adapted ],
    RecordLateResult: [],
    DestroyAdapterResources: []
  }
});

/**
 * Release one adapter value, whatever it calls its teardown.
 *
 * FOUR SPELLINGS, AND THEY ARE NOT A HEDGE. `Destroy` is this runtime's and
 * Carbon's; `destroy` is the platform's — a `GPUTexture`, `GPUBuffer` and
 * `AudioBufferSourceNode` all spell it lowercase — and `Dispose`/`dispose` cover
 * the same split for anything that names it that way. An adapter slot holds a
 * DEVICE object we did not define, so accepting the platform's spelling is a
 * bridge, not defensive coding against ourselves.
 *
 * Functions are accepted as well as objects: the texture-array path stores a
 * callable adapter value, and skipping it silently leaked whatever it held.
 *
 * @param {*} value Adapter slot contents.
 */
export function destroyAdapterValue(value)
{
  if (!value || (typeof value !== "object" && typeof value !== "function")) return;

  const destroy = value.Destroy || value.Dispose || value.destroy || value.dispose;
  if (typeof destroy === "function") destroy.call(value);
}
