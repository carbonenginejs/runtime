import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsResource as _CjsResource } from '../CjsResource.js';
import { normalizeResourcePath } from '../resourcePath.js';
import { CjsTextureParameterProxy } from './CjsTextureParameterProxy.js';

let _initClass;

/**
 * Mutable runtime aggregate for an ordered texture-array request.
 *
 * Private engine-bridge layer proxies only invalidate this parent. A resource
 * manager or engine scheduler consumes the coalesced update on a later frame
 * and prepares the corresponding immutable/cached texture-array payload.
 */
let _CjsTextureArrayRes;
new class extends _identity {
  static [class CjsTextureArrayRes extends _CjsResource {
    static {
      [_CjsTextureArrayRes, _initClass] = _applyDecs2311(this, [type.define({
        className: "CjsTextureArrayRes",
        family: "resource"
      })], [], 0, void 0, _CjsResource).c;
    }
    #layers = [];
    #dirtyLayers = new Set();
    #requestedRevision = 0;
    #preparedRevision = 0;
    #updateScheduled = false;
    #topologyChanged = false;
    #inFlightRequests = new Map();
    #readyWaiters = [];
    #failedRevision = 0;
    #failedError = null;
    #updateScheduler = null;
    #updateHandler = null;
    constructor(values = null) {
      const options = values && typeof values === "object" && !Array.isArray(values) ? values : {};
      const resourceValues = {
        ...options
      };
      delete resourceValues.layers;
      delete resourceValues.paths;
      delete resourceValues.layerCount;
      delete resourceValues.layerNames;
      delete resourceValues.updateScheduler;
      delete resourceValues.updateHandler;
      super(resourceValues);
      if (options.updateScheduler) this.SetUpdateScheduler(options.updateScheduler);
      if (options.updateHandler) this.SetUpdateHandler(options.updateHandler);
      const paths = options.layers || options.paths;
      if (paths !== undefined) {
        this.SetLayerResourcePaths(paths, options.layerNames);
      } else if (options.layerCount !== undefined) {
        this.SetLayerCount(options.layerCount, options.layerNames);
      }
    }
    GetLayerCount() {
      return this.#layers.length;
    }
    SetLayerCount(value, names = null) {
      const count = Number(value);
      if (!Number.isInteger(count) || count < 1) {
        throw new RangeError("CjsTextureArrayRes layer count must be a positive integer.");
      }
      if (count === this.#layers.length) {
        this.#SetLayerNames(names);
        return false;
      }
      const previousCount = this.#layers.length;
      if (count < previousCount) {
        this.#layers.length = count;
      } else {
        for (let layer = previousCount; layer < count; layer++) {
          this.#layers.push(this.#CreateLayer(layer, names?.[layer]));
        }
      }
      this.#SetLayerNames(names);
      this.#InvalidateRange(count, true);
      return true;
    }
    GetLayerParameter(layer) {
      return this.#GetLayer(layer).proxy;
    }
    GetLayerParameters(out = []) {
      for (const layer of this.#layers) out.push(layer.proxy);
      return out;
    }
    GetLayerResourcePath(layer) {
      return this.#GetLayer(layer).path;
    }
    GetLayerResourcePaths(out = []) {
      for (const layer of this.#layers) out.push(layer.path);
      return out;
    }
    SetLayerResourcePath(layer, value) {
      const record = this.#GetLayer(layer);
      const path = normalizeResourcePath(value);
      if (path === record.path) return false;
      record.path = path;
      record.resource = null;
      this.#InvalidateLayer(layer);
      return true;
    }
    SetLayerResourcePaths(values, names = null) {
      if (!Array.isArray(values) || values.length === 0) {
        throw new TypeError("CjsTextureArrayRes layers must be a non-empty array of resource paths.");
      }
      const paths = values.map(value => normalizeResourcePath(value && typeof value === "object" ? value.resourcePath ?? value.path ?? value.GetPath?.() ?? "" : value));
      const topologyChanged = paths.length !== this.#layers.length;
      let contentChanged = topologyChanged;
      let namesChanged = false;
      const changedLayers = new Set();
      const next = [];
      for (let layer = 0; layer < paths.length; layer++) {
        const current = this.#layers[layer];
        const name = names?.[layer] ?? current?.proxy?.GetParameterName?.() ?? "";
        if (!current) {
          next.push(this.#CreateLayer(layer, name, paths[layer]));
        } else {
          if (current.path !== paths[layer]) {
            current.path = paths[layer];
            current.resource = null;
            contentChanged = true;
            changedLayers.add(layer);
          }
          if (current.proxy.SetParameterName(name)) namesChanged = true;
          next.push(current);
        }
      }
      this.#layers = next;
      if (topologyChanged) {
        this.#InvalidateRange(paths.length, true);
      } else if (contentChanged) {
        this.#InvalidateLayers(changedLayers);
      }
      return contentChanged || namesChanged;
    }
    GetLayerResource(layer) {
      return this.#GetLayer(layer).resource;
    }
    SetLayerResource(layer, resource) {
      const record = this.#GetLayer(layer);
      const next = resource ?? null;
      if (record.resource === next) return false;
      record.resource = next;
      this.#InvalidateLayer(layer);
      return true;
    }

    /** Invalidate a layer whose resolved resource changed without changing identity. */
    TouchLayer(layer) {
      this.#GetLayer(layer);
      this.#InvalidateLayer(layer);
      return this;
    }

    /** Invalidate every current layer, for example after an adapter generation loss. */
    TouchAllLayers(options = {}) {
      this.#InvalidateRange(this.#layers.length, !!options.topologyChanged);
      return this;
    }
    GetRequestedRevision() {
      return this.#requestedRevision;
    }
    GetPreparedRevision() {
      return this.#preparedRevision;
    }
    NeedsUpdate() {
      return this.#updateScheduled || this.#dirtyLayers.size > 0 || this.#preparedRevision < this.#requestedRevision;
    }
    GetDirtyLayers() {
      return new Set(this.#dirtyLayers);
    }
    GetInFlightRevisions(out = []) {
      for (const revision of this.#inFlightRequests.keys()) out.push(revision);
      return out.sort((a, b) => a - b);
    }
    IsRevisionInFlight(revision) {
      return this.#inFlightRequests.has(revision);
    }
    SetUpdateScheduler(schedule = null) {
      if (schedule !== null && typeof schedule !== "function") {
        throw new TypeError("CjsTextureArrayRes update scheduler must be a function or null.");
      }
      this.#updateScheduler = schedule;
      if (schedule && this.#updateScheduled) schedule(this);
      return this;
    }
    SetUpdateHandler(handler = null) {
      if (handler !== null && typeof handler !== "function") {
        throw new TypeError("CjsTextureArrayRes update handler must be a function or null.");
      }
      this.#updateHandler = handler;
      return this;
    }

    /**
     * Consume all proxy changes as one immutable request snapshot.
     * A frame scheduler should call this at most once per parent per frame.
     */
    ConsumeUpdateRequest() {
      if (!this.#updateScheduled && this.#dirtyLayers.size === 0) return null;
      const request = Object.freeze({
        revision: this.#requestedRevision,
        paths: Object.freeze(this.GetLayerResourcePaths()),
        resources: Object.freeze(this.#layers.map(layer => layer.resource)),
        dirtyLayers: Object.freeze([...this.#dirtyLayers].sort((a, b) => a - b)),
        topologyChanged: this.#topologyChanged
      });
      this.#dirtyLayers.clear();
      this.#topologyChanged = false;
      this.#updateScheduled = false;
      this.#inFlightRequests.set(request.revision, request);
      return request;
    }

    /** Requeue a consumed current request after cancellation, loss, or retryable failure. */
    RetryUpdateRequest(revision = this.#requestedRevision) {
      const request = this.#inFlightRequests.get(revision);
      if (!request) return false;
      this.#inFlightRequests.delete(revision);
      if (revision !== this.#requestedRevision) return false;
      if (this.#failedRevision === revision) {
        this.#failedRevision = 0;
        this.#failedError = null;
      }
      for (const layer of request.dirtyLayers) {
        if (layer < this.#layers.length) this.#dirtyLayers.add(layer);
      }
      this.#topologyChanged ||= request.topologyChanged;
      this.#ScheduleUpdate();
      this.EmitEvent("revisionretry", this, revision);
      return true;
    }

    /** Complete a consumed request as failed, optionally making it retryable. */
    FailUpdateRequest(revision, error, options = {}) {
      if (options.retry) return this.RetryUpdateRequest(revision);
      if (!this.#inFlightRequests.has(revision)) return false;
      this.#inFlightRequests.delete(revision);
      if (revision !== this.#requestedRevision) return false;
      const failure = error instanceof Error ? error : new Error(String(error ?? "Texture array preparation failed."));
      this.#failedRevision = revision;
      this.#failedError = failure;
      if (this.#preparedRevision === 0) this.SetError(failure);
      this.EmitEvent("revisionfailed", this, revision, failure);
      this.#RejectReadyWaiters(revision, failure);
      return true;
    }

    /** Run the registered update handler for the current coalesced frame request. */
    Update(context = {}) {
      const request = this.ConsumeUpdateRequest();
      if (!request) return null;
      this.EmitEvent("update", this, request, context);
      return this.#updateHandler ? this.#updateHandler(this, request, context) : request;
    }

    /**
     * Atomically publish an opaque adapter allocation with its prepared revision.
     * The caller owns disposal of a successfully displaced allocation.
     */
    CommitPreparedAdapterRevision(revision, adapterKey, candidate, options = {}) {
      if (!adapterKey) throw new TypeError("CjsTextureArrayRes adapter publication requires a key.");
      if (candidate === null || candidate === undefined) {
        throw new TypeError("CjsTextureArrayRes adapter publication requires a candidate allocation.");
      }
      const inFlight = this.#inFlightRequests.has(revision);
      if (!inFlight || revision !== this.#requestedRevision) {
        if (inFlight) this.#inFlightRequests.delete(revision);
        if (options.destroyRejected !== false) DestroyAdapterValue(candidate);
        return Object.freeze({
          published: false,
          revision,
          displaced: null
        });
      }
      const displaced = this.GetAdapterResource(adapterKey);
      this.SetAdapterResource(adapterKey, candidate);
      this.#preparedRevision = revision;
      this.#failedRevision = 0;
      this.#failedError = null;
      this.#inFlightRequests.delete(revision);
      for (const pendingRevision of this.#inFlightRequests.keys()) {
        if (pendingRevision < revision) this.#inFlightRequests.delete(pendingRevision);
      }
      this.MarkPrepared();
      this.EmitEvent("revisionprepared", this, revision, adapterKey, candidate);
      this.#ResolveReadyWaiters(revision);
      return Object.freeze({
        published: true,
        revision,
        displaced: displaced === candidate ? null : displaced
      });
    }

    /** Destroy an unusable adapter allocation and request a complete rebuild. */
    HandleAdapterLoss(adapterKey, options = {}) {
      if (!adapterKey) throw new TypeError("CjsTextureArrayRes adapter loss requires a key.");
      const lost = this.GetAdapterResource(adapterKey);
      if (this.HasAdapterResource(adapterKey)) this.DestroyAdapterResource(adapterKey, options);
      this.#preparedRevision = 0;
      if (this.#layers.length) this.#InvalidateRange(this.#layers.length, true);
      if (this.state === _CjsResource.State.PREPARED) this.MarkPreparing();
      this.EmitEvent("adapterlost", this, adapterKey, lost);
      return lost;
    }

    /** Resolve when the generation requested at call time has been prepared. */
    Ready() {
      if (this.#requestedRevision === 0) {
        const error = new Error("Texture array resource has no configured layers.");
        error.code = "CJS_TEXTURE_ARRAY_UNCONFIGURED";
        return Promise.reject(error);
      }
      const revision = this.#requestedRevision;
      if (this.#preparedRevision >= revision && this.IsPrepared()) return Promise.resolve(this);
      if (this.#failedRevision === revision) return Promise.reject(this.#failedError);
      return new Promise((resolve, reject) => {
        this.#readyWaiters.push({
          revision,
          resolve,
          reject
        });
      });
    }
    #CreateLayer(layer, name = "", path = "") {
      return {
        path: normalizeResourcePath(path),
        resource: null,
        proxy: new CjsTextureParameterProxy(this, layer, {
          name
        })
      };
    }
    #GetLayer(layer) {
      if (!Number.isInteger(layer) || layer < 0 || layer >= this.#layers.length) {
        throw new RangeError(`CjsTextureArrayRes layer ${layer} is out of range.`);
      }
      return this.#layers[layer];
    }
    #SetLayerNames(names) {
      if (!names) return;
      for (let layer = 0; layer < Math.min(names.length, this.#layers.length); layer++) {
        this.#layers[layer].proxy.SetParameterName(names[layer]);
      }
    }
    #InvalidateLayer(layer) {
      this.#InvalidateLayers([layer]);
    }
    #InvalidateRange(count, topologyChanged = false) {
      const layers = [];
      for (let layer = 0; layer < count; layer++) layers.push(layer);
      this.#InvalidateLayers(layers, topologyChanged);
    }
    #InvalidateLayers(layers, topologyChanged = false) {
      const changed = [];
      for (const layer of layers) {
        if (!Number.isInteger(layer) || layer < 0 || layer >= this.#layers.length) continue;
        this.#dirtyLayers.add(layer);
        changed.push(layer);
      }
      if (!changed.length && !topologyChanged) return;
      this.#topologyChanged ||= topologyChanged;
      this.#failedRevision = 0;
      this.#failedError = null;
      this.#requestedRevision += 1;
      this.#ScheduleUpdate();
      this.EmitEvent("invalidated", this, Object.freeze(changed), this.#requestedRevision, Object.freeze({
        topologyChanged: this.#topologyChanged
      }));
    }
    #ScheduleUpdate() {
      if (this.#updateScheduled) return;
      this.#updateScheduled = true;
      this.#updateScheduler?.(this);
    }
    #ResolveReadyWaiters(revision) {
      const pending = [];
      for (const waiter of this.#readyWaiters) {
        if (waiter.revision <= revision) waiter.resolve(this);else pending.push(waiter);
      }
      this.#readyWaiters = pending;
    }
    #RejectReadyWaiters(revision, error) {
      const pending = [];
      for (const waiter of this.#readyWaiters) {
        if (waiter.revision <= revision) waiter.reject(error);else pending.push(waiter);
      }
      this.#readyWaiters = pending;
    }
  }];
  payload = "texture-array";
  constructor() {
    super(_CjsTextureArrayRes), _initClass();
  }
}();
function DestroyAdapterValue(value) {
  if (!value || typeof value !== "object" && typeof value !== "function") return;
  const destroy = value.Destroy || value.Dispose || value.destroy || value.dispose;
  if (typeof destroy === "function") destroy.call(value);
}

export { _CjsTextureArrayRes as CjsTextureArrayRes };
//# sourceMappingURL=CjsTextureArrayRes.js.map
