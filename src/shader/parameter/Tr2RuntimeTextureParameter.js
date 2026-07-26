// Source: E:\carbonengine\trinity\trinity\Shader\Parameter\Tr2RuntimeTextureParameter.h
// Source: E:\carbonengine\trinity\trinity\Shader\Parameter\Tr2RuntimeTextureParameter.cpp
// Source: E:\carbonengine\trinity\trinity\Shader\Parameter\Tr2RuntimeTextureParameter_Blue.cpp
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsParameter } from "./CjsParameter.js";


/**
 * A named texture slot fed by a runtime-supplied texture provider rather than an
 * authored res path.
 */
@type.define({
  className: "Tr2RuntimeTextureParameter",
  family: "shader"
})
export class Tr2RuntimeTextureParameter extends CjsParameter
{
  @io.notify
  @io.persist
  @type.objectRef("ITr2TextureProvider")
  texture = null;

  @io.persist
  @type.string
  name = "";

  @io.persist
  @type.uint32
  uavMipLevel = 0;

  #materials = [];

  /**
   * Blue construction form: forwards the name, provider and UAV mip level to
   * Create.
   */
  @carbon.method
  @impl.adapted
  __init__(name = "", texture = null, uavMipLevel = 0)
  {
    this.Create(name, texture, uavMipLevel);
  }

  /**
   * Assigns name, texture provider and UAV mip level together, notifying only
   * when at least one of them actually changed; returns whether it did.
   */
  @carbon.method
  @impl.implemented
  Create(name, texture, uavMipLevel = 0)
  {
    const nextName = String(name);
    const nextMipLevel = uavMipLevel >>> 0;
    const changed = this.name !== nextName || this.texture !== texture || this.uavMipLevel !== nextMipLevel;
    if (!changed)
    {
      return false;
    }
    this.name = nextName;
    this.texture = texture;
    this.uavMipLevel = nextMipLevel;
    this.UpdateValues({ property: "texture", source: this });
    return true;
  }

  /** The shader resource name this texture binds to. */
  @carbon.method
  @impl.implemented
  GetParameterName()
  {
    return this.name;
  }

  /** Content hash: the texture provider's identity (Carbon hashes its pointer). */
  @carbon.method
  @impl.adapted
  GetHashValue(startingHash = CjsParameter.FNV1_INITIAL)
  {
    return CjsParameter.hashFnv1Identity(this.texture, startingHash);
  }

  /**
   * Invalidates the resource sets of every material this parameter is attached
   * to.
   */
  @carbon.method
  @impl.adapted
  OnModified(_options = {})
  {
    this.#invalidateResourceSets();
    return true;
  }

  /**
   * Deliberately does nothing: Carbon caches the effect resource type here for
   * later resource-set binding, which runtime-trinity leaves to engine adapters.
   */
  @carbon.method
  @impl.adapted
  RebuildEffectHandles(_effectRes)
  {

    // Carbon caches the effect resource type here for later resource-set
    // binding. Runtime-trinity leaves that realization to engine adapters.
  }

  /**
   * Swaps the texture provider and notifies owners; returns false when it is
   * already the same object.
   */
  @carbon.method
  @impl.implemented
  SetTextureProvider(texture)
  {
    if (this.texture === texture)
    {
      return false;
    }
    this.texture = texture;
    this.UpdateValues({ property: "texture", source: this });
    return true;
  }

  /**
   * The attached provider, or null; this package holds the reference but never
   * resolves or uploads it.
   */
  @carbon.method
  @impl.implemented
  GetTextureProvider()
  {
    return this.texture;
  }

  /**
   * Sets the mip level to use when this texture is bound as an unordered-access
   * view, coerced to uint32.
   */
  @carbon.method
  @impl.implemented
  SetUavMipLevel(mipLevel)
  {
    this.uavMipLevel = mipLevel >>> 0;
  }

  /**
   * Registers a material to be invalidated when this parameter changes;
   * duplicates are ignored.
   */
  @carbon.method
  @impl.implemented
  OnAddedToMaterial(material)
  {
    if (!this.#materials.includes(material))
    {
      this.#materials.push(material);
    }
  }

  /**
   * Drops a material from the tracked list, so later texture swaps no longer
   * invalidate its resource sets.
   */
  @carbon.method
  @impl.implemented
  OnRemovedFromMaterial(material)
  {
    const index = this.#materials.indexOf(material);
    if (index >= 0)
    {
      this.#materials.splice(index, 1);
    }
  }

  /** Invalidates the resource sets of every attached material. */
  #invalidateResourceSets()
  {
    for (const material of this.#materials)
    {
      material?.InvalidateResourceSets?.();
    }
  }
}
