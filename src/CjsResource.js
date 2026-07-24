import { CjsEventEmitter } from "@carbonenginejs/runtime-utils/model";
import { CjsSchema, carbon, impl, type } from "@carbonenginejs/runtime-utils/schema";
import { getResourceExtension, normalizeResourcePath } from "./resourcePath.js";

/**
 * Deterministic activity values accepted by resource-facing lease methods.
 *
 * @typedef {object} CjsResourceActivityOptions
 * @property {number} [frame] Explicit non-negative activity frame.
 * @property {number} [time] Explicit non-negative activity timestamp in milliseconds.
 */

/**
 * Manager-owned callbacks attached while a resource has canonical ownership.
 * The controller deliberately contains no load, fetch, prepare, or reload hook.
 *
 * @typedef {object} CjsResourceLifecycleController
 * @property {Function} [isCurrent] Tests exact canonical manager ownership without renewing activity.
 * @property {Function} [keepAlive] Renews canonical identity activity.
 * @property {Function} [keepPayloadAlive] Renews identity and CPU-payload activity.
 * @property {Function} [lock] Adds one inactivity-purge lock and returns its count.
 * @property {Function} [unlock] Releases one inactivity-purge lock and returns its count.
 */

@type.define({ className: "CjsResource", family: "resource" })
/**
 * ResMan-owned runtime resource.
 *
 * Resources are not model graph objects: BLACK/RED graphs persist resource
 * paths (including empty paths), while CjsResMan constructs, initializes,
 * caches, and hydrates the corresponding runtime resource instances.
 */
export class CjsResource extends CjsEventEmitter
{
  #payload = null;

  @type.path
  path = "";

  @type.string
  ext = "";

  @type.string
  requirement = "";

  @type.string
  state = CjsResource.State.EMPTY;

  get isResource() {
    return true;
  }

  /**
   * Create a detached runtime resource with empty identity and payload state.
   * Schema values are applied without attaching manager lifecycle callbacks;
   * CjsResMan supplies those callbacks after canonical insertion.
   *
   * @param {object|null} [values=null] Initial decorated schema-field values.
   */
  constructor(values = null) {
    super();
    Object.defineProperty(this, "__adapterResources", {
      value: Object.create(null),
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
      result[field.name] = this[field.name];
    }
    return result;
  }

  /**
   * Initialize the resource identity from a path and optional extension.
   *
   * @param {string} path
   * @param {string|null} ext
   * @param {string|null} requirement
   * @returns {CjsResource}
   */
  @carbon.method
  @impl.adapted
  Initialize(path, ext = null, requirement = "") {
    this.path = normalizeResourcePath(path);
    this.ext = ext ? String(ext).replace(/^\./u, "").toLowerCase() : getResourceExtension(this.path);
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
  @carbon.method
  @impl.adapted
  GetPath() {
    return this.path;
  }

  /**
   * Get the normalized resource extension.
   *
   * @returns {string}
   */
  @carbon.method
  @impl.adapted
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
  @carbon.method
  @impl.adapted
  IsLoading() {
    return this.state === CjsResource.State.REQUESTED || this.state === CjsResource.State.LOADING;
  }

  /**
   * Return true when CPU resource payload data has been loaded.
   *
   * @returns {boolean}
   */
  @carbon.method
  @impl.adapted
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
  @carbon.method
  @impl.adapted
  IsPrepared() {
    return this.state === CjsResource.State.PREPARED;
  }

  /**
   * Return true when preparation completed successfully.
   *
   * @returns {boolean}
   */
  @carbon.method
  @impl.adapted
  IsGood() {
    return this.IsPrepared();
  }

  /**
   * Return true when preparation failed.
   *
   * @returns {boolean}
   */
  @carbon.method
  @impl.adapted
  IsFailed() {
    return this.state === CjsResource.State.FAILED;
  }

  SetState(state, ...details) {
    if (!CjsResource.IsValidState(state)) {
      throw new TypeError(`Invalid CjsResource state: ${state}`);
    }
    const previous = this.state;
    if (previous === state) return this;
    this.state = state;
    this.EmitEvent?.(state, this, ...details);
    this.EmitEvent?.("statechange", this, state, previous);
    return this;
  }

  MarkRequested() {
    return this.SetState(CjsResource.State.REQUESTED);
  }

  MarkLoading() {
    return this.SetState(CjsResource.State.LOADING);
  }

  MarkLoaded() {
    return this.SetState(CjsResource.State.LOADED);
  }

  MarkPreparing() {
    return this.SetState(CjsResource.State.PREPARING);
  }

  MarkPrepared() {
    return this.SetState(CjsResource.State.PREPARED);
  }

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
    const previous = this.#payload;
    this.#payload = payload;
    if (this.object === previous) this.object = payload;
    if (this.HasPayload()) this.KeepPayloadAlive();
    return this;
  }

  /**
   * Read the plain CPU payload associated with this resource.
   *
   * The query is pure and does not renew the payload lease.
   *
   * @returns {*} Current payload reference, or `null` after release.
   */
  GetPayload() {
    return this.#payload;
  }

  /**
   * Return whether a payload has been explicitly assigned. This query is pure
   * and does not renew the payload lease.
   *
   * @returns {boolean} Whether a non-null payload is attached.
   */
  HasPayload() {
    return this.#payload !== null && this.#payload !== undefined;
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
    const payload = this.#payload;
    this.#payload = null;
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
    return Boolean(this.__lifecycleController?.isCurrent?.());
  }

  /**
   * Explicitly renew this resource's canonical identity activity.
   * Unlike ccpwgl compatibility behavior, `IsGood()`, `HasLoaded()`, and other
   * state queries never call this method implicitly. Renewal never fetches or
   * reloads a purged resource.
   *
   * @param {CjsResourceActivityOptions} [options={}] Optional deterministic activity values.
   * @returns {CjsResource} This resource, whether bound or detached.
   * @throws {TypeError} If the bound manager rejects invalid activity values.
   */
  KeepAlive(options = {})
  {
    this.__lifecycleController?.keepAlive?.(options);
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
    this.__lifecycleController?.keepPayloadAlive?.(options);
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
    return this.__lifecycleController?.lock?.() || 0;
  }

  /**
   * Release one explicit purge lock without allowing the count to underflow.
   * Unlocking does not immediately purge or release a payload.
   *
   * @returns {number} Remaining lock count, or `0` when detached or unlocked.
   */
  Unlock()
  {
    return this.__lifecycleController?.unlock?.() || 0;
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
    this.__objectRequest = request === null ? null : Object.freeze({ ...request });
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
   * manager. Detached or purged handles do not revive themselves: their loader
   * resolves the manager's current canonical identity.
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
      DestroyAdapterValue(value);
    }
    delete this.__adapterResources[name];
    return this;
  }

  /**
   * Remove all adapter resources and optionally call their destroy/dispose methods.
   *
   * @param {object} options
   * @returns {CjsResource}
   */
  DestroyAdapterResources(options = {}) {
    for (const key of Object.keys(this.__adapterResources)) {
      this.DestroyAdapterResource(key, options);
    }
    return this;
  }

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

  static IsValidState(state) {
    return Object.values(CjsResource.State).includes(state);
  }
}

function DestroyAdapterValue(value) {
  if (!value || typeof value !== "object") return;
  const destroy = value.Destroy || value.Dispose || value.destroy || value.dispose;
  if (typeof destroy === "function") {
    destroy.call(value);
  }
}
