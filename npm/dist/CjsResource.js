import { identity as _identity, applyDecs2311 as _applyDecs2311 } from './_virtual/_rollupPluginBabelHelpers.js';
import { CjsEventEmitter } from '@carbonenginejs/core-types/model';
import { type, carbon, impl, CjsSchema } from '@carbonenginejs/core-types/schema';
import { normalizeResourcePath, getResourceExtension } from './resourcePath.js';

let _initProto, _initClass, _init_path, _init_extra_path, _init_ext, _init_extra_ext, _init_requirement, _init_extra_requirement, _init_state, _init_extra_state;
let _CjsResource;
new class extends _identity {
  static [class CjsResource extends CjsEventEmitter {
    static {
      ({
        e: [_init_path, _init_extra_path, _init_ext, _init_extra_ext, _init_requirement, _init_extra_requirement, _init_state, _init_extra_state, _initProto],
        c: [_CjsResource, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "CjsResource",
        family: "resource"
      })], [[[type, type.path], 16, "path"], [[type, type.string], 16, "ext"], [[type, type.string], 16, "requirement"], [[type, type.string], 16, "state"], [[carbon, carbon.method, impl, impl.adapted], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetPath"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetExt"], [[carbon, carbon.method, impl, impl.adapted], 18, "IsLoading"], [[carbon, carbon.method, impl, impl.adapted], 18, "HasLoaded"], [[carbon, carbon.method, impl, impl.adapted], 18, "IsPrepared"], [[carbon, carbon.method, impl, impl.adapted], 18, "IsGood"], [[carbon, carbon.method, impl, impl.adapted], 18, "IsFailed"]], 0, void 0, CjsEventEmitter));
    }
    #dto = (_initProto(this), null);
    path = _init_path(this, "");
    ext = (_init_extra_path(this), _init_ext(this, ""));
    requirement = (_init_extra_ext(this), _init_requirement(this, ""));
    state = (_init_extra_requirement(this), _init_state(this, _CjsResource.State.EMPTY));
    get isResource() {
      return true;
    }
    constructor(values = null) {
      super(), _init_extra_state(this);
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
      if (values) {
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
    Initialize(path, ext = null, requirement = "") {
      this.path = normalizeResourcePath(path);
      this.ext = ext ? String(ext).replace(/^\./u, "").toLowerCase() : getResourceExtension(this.path);
      this.requirement = requirement === null || requirement === undefined ? "" : String(requirement).trim().toLowerCase();
      this.state = _CjsResource.State.EMPTY;
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

    /** Return the semantic outcome requested from this source path. */
    GetRequirement() {
      return this.requirement;
    }

    /**
     * Return true when the resource is currently loading.
     *
     * @returns {boolean}
     */
    IsLoading() {
      return this.state === _CjsResource.State.REQUESTED || this.state === _CjsResource.State.LOADING;
    }

    /**
     * Return true when CPU resource payload data has been loaded.
     *
     * @returns {boolean}
     */
    HasLoaded() {
      return this.state === _CjsResource.State.LOADED || this.state === _CjsResource.State.PREPARING || this.state === _CjsResource.State.PREPARED;
    }

    /**
     * Return true when preparation has completed or produced a good resource.
     *
     * @returns {boolean}
     */
    IsPrepared() {
      return this.state === _CjsResource.State.PREPARED;
    }

    /**
     * Return true when preparation completed successfully.
     *
     * @returns {boolean}
     */
    IsGood() {
      return this.IsPrepared();
    }

    /**
     * Return true when preparation failed.
     *
     * @returns {boolean}
     */
    IsFailed() {
      return this.state === _CjsResource.State.FAILED;
    }
    SetState(state, ...details) {
      if (!_CjsResource.IsValidState(state)) {
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
      return this.SetState(_CjsResource.State.REQUESTED);
    }
    MarkLoading() {
      return this.SetState(_CjsResource.State.LOADING);
    }
    MarkLoaded() {
      return this.SetState(_CjsResource.State.LOADED);
    }
    MarkPreparing() {
      return this.SetState(_CjsResource.State.PREPARING);
    }
    MarkPrepared() {
      return this.SetState(_CjsResource.State.PREPARED);
    }
    MarkGood() {
      return this.MarkPrepared();
    }
    SetError(error) {
      this.error = error || null;
      return this.SetState(_CjsResource.State.FAILED, this.error);
    }

    /**
     * Store the semantic DTO associated with this resource.
     *
     * @param {*} dto
     * @returns {CjsResource}
     */
    SetDTO(dto = null) {
      this.#dto = dto;
      return this;
    }

    /**
     * Read the semantic DTO associated with this resource.
     *
     * @returns {*}
     */
    GetDTO() {
      return this.#dto;
    }

    /**
     * Returns true when a DTO has been explicitly assigned.
     *
     * @returns {boolean}
     */
    HasDTO() {
      return !!this.#dto;
    }

    /**
     * Release the complete DTO reference after consumers have retained the
     * scalars and typed-array views they require.
     */
    ReleaseDTO() {
      this.#dto = null;
      return this;
    }

    /**
     * Bind the manager-owned object operation for this shared resource handle.
     *
     * @param {Function|null} loader
     * @returns {CjsResource}
     */
    SetObjectLoader(loader = null) {
      if (loader !== null && typeof loader !== "function") {
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
    GetObject(options = {}) {
      if (!this.__objectLoader) {
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
    Ready(options = {}) {
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
    static IsValidState(state) {
      return Object.values(_CjsResource.State).includes(state);
    }
  }];
  State = Object.freeze({
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
  constructor() {
    super(_CjsResource), _initClass();
  }
}();
function DestroyAdapterValue(value) {
  if (!value || typeof value !== "object") return;
  const destroy = value.Destroy || value.Dispose || value.destroy || value.dispose;
  if (typeof destroy === "function") {
    destroy.call(value);
  }
}

export { _CjsResource as CjsResource };
//# sourceMappingURL=CjsResource.js.map
