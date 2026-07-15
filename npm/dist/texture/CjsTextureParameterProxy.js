import { CjsEventEmitter } from '@carbonenginejs/core-types/model';

/**
 * Runtime-only internal texture parameter facade for one array layer.
 *
 * The proxy mirrors the public texture-parameter path API while delegating
 * storage, invalidation, readiness, and adapter ownership to its parent array.
 * Engines bridge public parameters into it; it does not replace persisted
 * parameter entries or their individual source resources. It deliberately
 * carries no shader metadata or backend objects.
 */
class CjsTextureParameterProxy extends CjsEventEmitter {
  #parent;
  #layer;
  #name;
  constructor(parent, layer, options = {}) {
    super();
    if (!parent || typeof parent.SetLayerResourcePath !== "function") {
      throw new TypeError("CjsTextureParameterProxy requires a CjsTextureArrayRes-compatible parent.");
    }
    if (!Number.isInteger(layer) || layer < 0) {
      throw new RangeError("CjsTextureParameterProxy layer must be a non-negative integer.");
    }
    this.#parent = parent;
    this.#layer = layer;
    this.#name = options.name === undefined ? "" : String(options.name);
  }
  get resourcePath() {
    return this.GetResourcePath();
  }

  /** The aggregate texture resource used by the shader. */
  get textureRes() {
    return this.#parent;
  }

  /** Compatibility alias for textureRes. */
  get res() {
    return this.#parent;
  }

  /** Compatibility alias used by Carbon-shaped texture parameters. */
  get resource() {
    return this.#parent;
  }
  set resourcePath(value) {
    this.SetResourcePath(value);
  }
  get name() {
    return this.#name;
  }
  set name(value) {
    this.SetParameterName(value);
  }
  GetParent() {
    return this.#parent;
  }
  GetLayerIndex() {
    return this.#layer;
  }
  GetParameterName() {
    return this.#name;
  }
  SetParameterName(value) {
    const next = value === null || value === undefined ? "" : String(value);
    if (next === this.#name) return false;
    const previous = this.#name;
    this.#name = next;
    this.EmitEvent("changed", this, "name", next, previous);
    return true;
  }
  GetResourcePath() {
    return this.#parent.GetLayerResourcePath(this.#layer);
  }
  SetResourcePath(value) {
    const previous = this.GetResourcePath();
    if (!this.#parent.SetLayerResourcePath(this.#layer, value)) return false;
    this.EmitEvent("changed", this, "resourcepath", this.GetResourcePath(), previous);
    return true;
  }
  GetValue() {
    return this.GetResourcePath();
  }
  SetValue(value) {
    if (value === undefined) return false;
    return this.SetResourcePath(value);
  }
  EqualsValue(value) {
    return String(value ?? "").trim().replace(/\\/gu, "/").replace(/\/+/gu, "/").toLowerCase() === this.GetResourcePath();
  }

  /** Return the aggregate texture resource used by the shader binding. */
  GetResource() {
    return this.#parent;
  }

  /** Return the optional resolved source resource for this layer. */
  GetSourceResource() {
    return this.#parent.GetLayerResource(this.#layer);
  }
  SetSourceResource(resource) {
    const previous = this.GetSourceResource();
    if (!this.#parent.SetLayerResource(this.#layer, resource)) return false;
    this.EmitEvent("changed", this, "sourceresource", this.GetSourceResource(), previous);
    return true;
  }
  SetResource(resource) {
    return this.SetSourceResource(resource);
  }

  /** Invalidate this layer after an in-place source content revision. */
  Touch() {
    this.#parent.TouchLayer(this.#layer);
    this.EmitEvent("changed", this, "sourcerevision", this.GetSourceResource());
    return this;
  }
  GetResources(out = []) {
    if (!out.includes(this.#parent)) out.push(this.#parent);
    return out;
  }
  IsPrepared() {
    return this.#parent.IsPrepared();
  }
  IsGood() {
    return this.#parent.IsGood();
  }
  Ready(options = {}) {
    return this.#parent.Ready(options);
  }
}

export { CjsTextureParameterProxy };
//# sourceMappingURL=CjsTextureParameterProxy.js.map
