import { CjsEventEmitter } from "#model";

/**
 * `CjsTextureArrayRes`-owned parameter facade for one array layer that mirrors
 * the public path API while delegating storage, invalidation, readiness, and
 * adapter ownership to its parent, carrying no shader metadata or backend
 * objects itself.
 *
 * Engines bridge public parameters into it; it does not replace persisted
 * parameter entries or their individual source resources.
 */
export class CjsTextureArrayResParameterProxy extends CjsEventEmitter
{
  #parent;
  #layer;
  #name;

  /** Creates a CjsTextureArrayResParameterProxy with caller-provided initial state. */
  constructor(parent, layer, options = {})
  {
    super();
    if (!parent || typeof parent.SetLayerResourcePath !== "function")
    {
      throw new TypeError("CjsTextureArrayResParameterProxy requires a CjsTextureArrayRes-compatible parent.");
    }
    if (!Number.isInteger(layer) || layer < 0)
    {
      throw new RangeError("CjsTextureArrayResParameterProxy layer must be a non-negative integer.");
    }

    this.#parent = parent;
    this.#layer = layer;
    this.#name = options.name === undefined ? "" : String(options.name);
  }

  /**
   * Returns the resource path represented by this texture layer proxy for the
   * texture parameter proxy.
   */
  get resourcePath()
  {
    return this.GetResourcePath();
  }

  /** The aggregate texture resource used by the shader. */
  get textureRes()
  {
    return this.#parent;
  }

  /** Compatibility alias for textureRes. */
  get res()
  {
    return this.#parent;
  }

  /** Compatibility alias used by Carbon-shaped texture parameters. */
  get resource()
  {
    return this.#parent;
  }

  /** Updates the resource path exposed by the current texture parameter proxy. */
  set resourcePath(value)
  {
    this.SetResourcePath(value);
  }

  /**
   * Returns the public parameter name represented by this texture layer proxy
   * for the texture parameter proxy.
   */
  get name()
  {
    return this.#name;
  }

  /** Updates the name exposed by the current texture parameter proxy. */
  set name(value)
  {
    this.SetParameterName(value);
  }

  /** Returns parent from the current texture parameter proxy. */
  GetParent()
  {
    return this.#parent;
  }

  /** Returns layer index from the current texture parameter proxy. */
  GetLayerIndex()
  {
    return this.#layer;
  }

  /** Returns parameter name from the current texture parameter proxy. */
  GetParameterName()
  {
    return this.#name;
  }

  /** Updates parameter name in the current texture parameter proxy. */
  SetParameterName(value)
  {
    const next = value === null || value === undefined ? "" : String(value);
    if (next === this.#name) return false;
    const previous = this.#name;
    this.#name = next;
    this.EmitEvent("changed", this, "name", next, previous);
    return true;
  }

  /** Returns resource path from the current texture parameter proxy. */
  GetResourcePath()
  {
    return this.#parent.GetLayerResourcePath(this.#layer);
  }

  /** Updates resource path in the current texture parameter proxy. */
  SetResourcePath(value)
  {
    const previous = this.GetResourcePath();
    if (!this.#parent.SetLayerResourcePath(this.#layer, value)) return false;
    this.EmitEvent("changed", this, "resourcepath", this.GetResourcePath(), previous);
    return true;
  }

  /** Returns value from the current texture parameter proxy. */
  GetValue()
  {
    return this.GetResourcePath();
  }

  /** Updates value in the current texture parameter proxy. */
  SetValue(value)
  {
    if (value === undefined) return false;
    return this.SetResourcePath(value);
  }

  /** Compares value with the current texture parameter proxy value. */
  EqualsValue(value)
  {
    return String(value ?? "").trim().replace(/\\/gu, "/").replace(/\/+/gu, "/").toLowerCase() === this.GetResourcePath();
  }

  /** Return the aggregate texture resource used by the shader binding. */
  GetResource()
  {
    return this.#parent;
  }

  /** Return the optional resolved source resource for this layer. */
  GetSourceResource()
  {
    return this.#parent.GetLayerResource(this.#layer);
  }

  /** Updates source resource in the current texture parameter proxy. */
  SetSourceResource(resource)
  {
    const previous = this.GetSourceResource();
    if (!this.#parent.SetLayerResource(this.#layer, resource)) return false;
    this.EmitEvent("changed", this, "sourceresource", this.GetSourceResource(), previous);
    return true;
  }

  /** Updates resource in the current texture parameter proxy. */
  SetResource(resource)
  {
    return this.SetSourceResource(resource);
  }

  /** Invalidate this layer after an in-place source content revision. */
  Touch()
  {
    this.#parent.TouchLayer(this.#layer);
    this.EmitEvent("changed", this, "sourcerevision", this.GetSourceResource());
    return this;
  }

  /** Returns resources from the current texture parameter proxy. */
  GetResources(out = [])
  {
    if (!out.includes(this.#parent)) out.push(this.#parent);
    return out;
  }

  /** Reports whether the current texture parameter proxy satisfies prepared. */
  IsPrepared()
  {
    return this.#parent.IsPrepared();
  }

  /** Reports whether the current texture parameter proxy satisfies good. */
  IsGood()
  {
    return this.#parent.IsGood();
  }

  /** Reads y from the current texture parameter proxy. */
  Ready(options = {})
  {
    return this.#parent.Ready(options);
  }
}
