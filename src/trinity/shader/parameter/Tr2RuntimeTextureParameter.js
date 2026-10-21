import { exposure as be } from "#be";
// Source: trinity/trinity/Shader/Parameter/Tr2RuntimeTextureParameter.h
// Source: trinity/trinity/Shader/Parameter/Tr2RuntimeTextureParameter.cpp
// Source: trinity/trinity/Shader/Parameter/Tr2RuntimeTextureParameter_Blue.cpp
import { IsMatch, INotify, CjsResource } from "#blue";
import { CjsSchema, meta, type, blue } from "#schema";
import { CjsParameter } from "./CjsParameter.js";
import { ITriEffectResourceParameter } from "./ITriEffectResourceParameter.js";
import { ResourceFlags } from "./ITr2EffectValue.js";
import { Tr2ColorSpace } from "#consts/render-context";
import { RealizeTexture } from "../../core/Tr2ImageIOHelpers.js";


/**
 * A named texture slot fed by a runtime-supplied texture provider rather than an
 * authored res path.
 */
@be.define("Tr2RuntimeTextureParameter")
@blue.inherit(ITriEffectResourceParameter, INotify)
@be.mapInterface(ITriEffectResourceParameter)
@be.mapInterface(INotify)
export class Tr2RuntimeTextureParameter extends CjsParameter
{
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.rootRef("ITr2TextureProvider")
  texture = null;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "";

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.uint32
  uavMipLevel = 0;

  #materials = [];

  /**
   * Blue construction form: forwards the name, provider and UAV mip level to
   * Create.
   */
  @blue.method
  @meta.adapted
  __init__(name = "", texture = null, uavMipLevel = 0)
  {
    this.Create(name, texture, uavMipLevel);
  }

  /**
   * Assigns name, texture provider and UAV mip level together, notifying only
   * when at least one of them actually changed; returns whether it did.
   */
  @blue.method
  @meta.implemented
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
    this.OnModified("texture");
    return true;
  }

  /** The shader resource name this texture binds to. */

  @meta.implemented
  GetParameterName()
  {
    return this.name;
  }

  /** Content hash: the texture provider's identity (Carbon hashes its pointer). */

  @meta.adapted
  GetHashValue(startingHash = CjsParameter.FNV1_INITIAL)
  {
    return CjsParameter.hashFnv1Identity(this.texture, startingHash);
  }

  /**
   * Invalidates the resource sets of every material this parameter is attached
   * to.
   */

  @meta.implemented
  OnModified(propertyName)
  {
    if (IsMatch(propertyName, "texture")) this.#invalidateResourceSets();
    return true;
  }

  /**
   * Deliberately does nothing: Carbon caches the effect resource type here for
   * later resource-set binding, which the Trinity layer leaves to engine adapters.
   */

  @meta.adapted
  RebuildEffectHandles(_effectRes)
  {

    // Carbon caches the effect resource type here for later resource-set
    // binding. Not ported yet.
  }

  /**
   * Carbon `CopyToResourceSet` (`Tr2RuntimeTextureParameter.cpp:30-46`): the
   * provider's texture as a shader resource. With none, a null binding, which
   * a backend fills with its placeholder as Carbon's fallback texture.
   *
   * Adapted: a provider that is a loaded texture resource has its texture
   * made here, on first bind, through the trailing `renderContext`
   * (`RealizeTexture`), as `TriTextureParameter` and `TriVariable` do; Carbon
   * made it at load. Without this, a `TriTextureRes` handed to
   * `Tr2Effect.SetParameter` (CORTAO's lookup table) bound the placeholder
   * forever.
   *
   * @param {object} resourceDesc A `Tr2ResourceSetDescriptionAL`.
   * @param {number} stage A `ShaderType`.
   * @param {number} registerIndex The register.
   * @param {number} [flags] A `ResourceFlags` word; bit 0 is sRGB.
   * @param {object} [renderContext] The context a resource's texture is made through.
   * @returns {boolean} Whether the slot took the binding.
   */
  @blue.method
  @meta.adapted
  CopyToResourceSet(resourceDesc, stage, registerIndex, flags = 0, renderContext = null)
  {
    const colorSpace = (flags & ResourceFlags.RESOURCE_FLAG_SRGB)
      ? Tr2ColorSpace.COLOR_SPACE_SRGB
      : Tr2ColorSpace.COLOR_SPACE_LINEAR;

    return resourceDesc.SetSrv__TextureAL(stage, registerIndex, this._Texture(renderContext), colorSpace);
  }

  /** The provider's texture, realized through the context if it is a resource that has loaded but not yet been created; null otherwise. */
  _Texture(renderContext)
  {
    const provider = this.texture;

    if (!provider) return null;

    const texture = provider.GetTexture();
    // Only a cached resource can be realized; Carbon's BlueCastPtr to a
    // resource, as in KeepAlive below.
    const resource = CjsSchema.cast(provider, CjsResource);

    if (texture || !renderContext || !resource) return texture;

    return RealizeTexture(resource, renderContext);
  }

  /**
   * Carbon `ApplyUav` (`Tr2RuntimeTextureParameter.cpp:49-60`): the
   * provider's texture as an unordered-access view at this parameter's mip.
   *
   * @param {object} resourceDesc A `Tr2ResourceSetDescriptionAL`.
   * @param {number} stage A `ShaderType`.
   * @param {number} registerIndex The register.
   * @returns {boolean} Whether the slot took the binding.
   */
  @blue.method
  @meta.implemented
  ApplyUav(resourceDesc, stage, registerIndex)
  {
    const texture = this.texture ? this.texture.GetTexture() : null;

    return texture
      ? resourceDesc.SetUav__TextureAL(stage, registerIndex, texture, this.uavMipLevel)
      : resourceDesc.SetUav__TextureAL(stage, registerIndex, null);
  }

  /**
   * Swaps the texture provider and notifies owners; returns false when it is
   * already the same object.
   */

  @meta.implemented
  SetTextureProvider(texture)
  {
    if (this.texture === texture)
    {
      return false;
    }
    this.texture = texture;
    this.OnModified("texture");
    return true;
  }

  /**
   * The attached provider, or null; this package holds the reference but never
   * resolves or uploads it.
   */

  @meta.implemented
  GetTextureProvider()
  {
    return this.texture;
  }

  /**
   * Sets the mip level to use when this texture is bound as an unordered-access
   * view, coerced to uint32.
   */

  @meta.implemented
  SetUavMipLevel(mipLevel)
  {
    this.uavMipLevel = mipLevel >>> 0;
  }

  /**
   * Registers a material to be invalidated when this parameter changes;
   * duplicates are ignored.
   */

  @meta.implemented
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
  /**
   * Renew the bound provider when it is a cached resource - the SSAO lookup
   * table, say - so the material using it does not lose it to an idle purge
   * (`ITriEffectResourceParameter.KeepAlive`, called by `Tr2Effect.IsGood`).
   *
   * Ours, like TriTextureParameter's: Carbon's resources are reference counted.
   * The cast is to a resource as Carbon's `BlueCastPtr` does; a texture
   * reference or render target is not one, and holds nothing to renew.
   */
  @meta.cjs
    @meta.adapted
  KeepAlive()
  {
    const resource = CjsSchema.cast(this.texture, CjsResource);
    if (resource) resource.KeepAlive();
  }

  /** Stops tracking a material so later texture changes no longer invalidate its resource sets. */

  @meta.implemented
  OnRemovedFromMaterial(material)
  {
    const index = this.#materials.indexOf(material);
    if (index >= 0)
    {
      this.#materials.splice(index, 1);
    }
  }

  /** Invalidates every attached material directly (Tr2RuntimeTextureParameter.cpp:17-27). */
  #invalidateResourceSets()
  {
    for (const material of this.#materials)
    {
      material.InvalidateResourceSets();
    }
  }
}

// Exact identities from Tr2RuntimeTextureParameter_Blue.cpp; no exposure chain.
