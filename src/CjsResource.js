import { CjsEventEmitter } from "@carbonenginejs/core-types/model";
import { CjsSchema, carbon, impl, type } from "@carbonenginejs/core-types/schema";
import { getResourceExtension, normalizeResourcePath } from "./resourcePath.js";

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

  /** Return the semantic outcome requested from this source path. */
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

  SetError(error) {
    this.error = error || null;
    return this.SetState(CjsResource.State.FAILED, this.error);
  }

  /**
   * Store the plain CPU payload associated with this resource.
   * Concrete resource classes validate the fields they require before calling
   * this method.
   *
   * @param {*} payload
   * @returns {CjsResource}
   */
  SetPayload(payload = null) {
    this.#payload = payload;
    return this;
  }

  /**
   * Read the plain CPU payload associated with this resource.
   *
   * @returns {*}
   */
  GetPayload() {
    return this.#payload;
  }

  /**
   * Returns true when a payload has been explicitly assigned.
   *
   * @returns {boolean}
   */
  HasPayload() {
    return this.#payload !== null && this.#payload !== undefined;
  }

  /**
   * Release the complete payload reference after consumers have retained the
   * scalars and typed-array views they require.
   */
  ReleasePayload() {
    this.#payload = null;
    return this;
  }

  /**
   * Bind the manager-owned object operation for this shared resource handle.
   *
   * @param {Function|null} loader
   * @returns {CjsResource}
   */
  SetObjectLoader(loader = null)
  {
    if (loader !== null && typeof loader !== "function")
    {
      throw new TypeError("CjsResource.SetObjectLoader requires a function or null.");
    }
    this.__objectLoader = loader;
    return this;
  }

  /**
   * Return the manager-owned, deduplicated object operation.
   *
   * @param {object} options
   * @returns {Promise<*>}
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
   * Promise-shaped readiness boundary for callers that already hold a resource.
   *
   * @param {object} options
   * @returns {Promise<*>}
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
