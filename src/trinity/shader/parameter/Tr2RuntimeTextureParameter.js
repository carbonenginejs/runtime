// Source: trinity/trinity/Shader/Parameter/Tr2RuntimeTextureParameter.h
// Source: trinity/trinity/Shader/Parameter/Tr2RuntimeTextureParameter.cpp
// Source: trinity/trinity/Shader/Parameter/Tr2RuntimeTextureParameter_Blue.cpp
import { exposure as be } from "#be";
import { IsMatch, INotify, IBlueResource } from "#blue";
import { CjsSchema, type } from "#schema";
import { FNV1_INITIAL, hashFnv1Identity } from "#utils/hash";
import { ITriEffectResourceParameter } from "./ITriEffectResourceParameter.js";
import { ResourceFlags } from "./ITr2EffectValue.js";
import { Tr2ColorSpace } from "#consts/render-context";
import { RealizeTexture } from "../../core/Tr2ImageIOHelpers.js";
import { Tr2DeviceResource } from "../../core/device/Tr2DeviceResource.js";


/**
 * A named texture slot fed by a runtime-supplied texture provider rather than an
 * authored res path.
 */
@be.define({
  name: "Tr2RuntimeTextureParameter",
  inherit: [ ITriEffectResourceParameter, INotify ],
  // Tr2RuntimeTextureParameter_Blue.cpp:11-21, in Carbon's order.
  interfaces: [ ITriEffectResourceParameter, INotify ],
  members: [
    [ be.ATTR, "name", be.READWRITE | be.PERSIST ],
    [ be.ATTR, "texture", be.READWRITE | be.PERSIST | be.NOTIFY ],
    [ be.ATTR, "uavMipLevel", be.READWRITE | be.PERSIST ],
    [ be.METHOD, "__init__", be.WRAP_OPTIONAL_ARGS, 3, "Create" ]
  ]
})
export class Tr2RuntimeTextureParameter extends ITriEffectResourceParameter
{

  @type.object.ref("ITr2TextureProvider")
  texture = null;

  @type.string
  name = "";

  @type.uint32
  uavMipLevel = 0;

  _materials = [];

  /**
   * Blue construction form: forwards the name, provider and UAV mip level to
   * Create.
   *
   * @adapted
   */
  __init__(name = "", texture = null, uavMipLevel = 0)
  {
    this.Create(name, texture, uavMipLevel);
  }

  /**
   * Assigns name, texture provider and UAV mip level together, notifying only
   * when at least one of them actually changed; returns whether it did.
   *
   * @implemented
   */
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

  /**
   * The shader resource name this texture binds to.
   *
   * @implemented
   */

  GetParameterName()
  {
    return this.name;
  }

  /**
   * Content hash: the texture provider's identity (Carbon hashes its pointer).
   *
   * @adapted
   */

  GetHashValue(startingHash = FNV1_INITIAL)
  {
    return hashFnv1Identity(this.texture, startingHash);
  }

  /**
   * Invalidates the resource sets of every material this parameter is attached
   * to.
   *
   * @implemented
   */

  OnModified(propertyName)
  {
    if (IsMatch(propertyName, "texture")) this._invalidateResourceSets();
    return true;
  }

  /**
   * Deliberately does nothing: Carbon caches the effect resource type here for
   * later resource-set binding, which the Trinity layer leaves to engine adapters.
   *
   * @adapted
   */

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
   * @adapted a provider that is a loaded texture resource has its texture
   *   made here, on first bind, through the trailing `renderContext`
   *   (`RealizeTexture`), as `TriTextureParameter` and `TriVariable` do; Carbon
   *   made it at load. Without this, a `TriTextureRes` handed to
   *   `Tr2Effect.SetParameter` (CORTAO's lookup table) bound the placeholder
   *   forever.
   * @param {object} resourceDesc A `Tr2ResourceSetDescriptionAL`.
   * @param {number} stage A `ShaderType`.
   * @param {number} registerIndex The register.
   * @param {number} [flags] A `ResourceFlags` word; bit 0 is sRGB.
   * @param {object} [renderContext] The context a resource's texture is made through.
   * @returns {boolean} Whether the slot took the binding.
   * Carbon declaration: Tr2RuntimeTextureParameter::CopyToResourceSet (trinity/trinity/Shader/Parameter/Tr2RuntimeTextureParameter.h:19).
   */
  CopyToResourceSet(resourceDesc, stage, registerIndex, flags = 0, renderContext = null)
  {
    const colorSpace = (flags & ResourceFlags.RESOURCE_FLAG_SRGB)
      ? Tr2ColorSpace.COLOR_SPACE_SRGB
      : Tr2ColorSpace.COLOR_SPACE_LINEAR;

    return resourceDesc.SetSrv__TextureAL(stage, registerIndex, this._Texture(renderContext), colorSpace);
  }

  /**
   * The provider's texture, realized through the context if it is a resource that has loaded but not yet been created; null otherwise.
   *
   * @cjs
   * @implemented
   * @param {object|null} renderContext Context used for deferred device realization.
   * @returns {object|null} Native AL texture or null until available.
   */
  _Texture(renderContext)
  {
    const provider = this.texture;

    if (!provider) return null;

    const texture = provider.GetTexture();
    // Only a cached resource can be realized; Carbon's BlueCastPtr to a
    // resource, as in KeepAlive below.
    const resource = CjsSchema.cast(provider, IBlueResource);

    if (texture || !renderContext || !resource) return texture;

    return RealizeTexture(resource, renderContext);
  }

  /**
   * Carbon `ApplyUav` (`Tr2RuntimeTextureParameter.cpp:49-60`): the
   * provider's texture as an unordered-access view at this parameter's mip.
   *
   * @implemented
   * @param {object} resourceDesc A `Tr2ResourceSetDescriptionAL`.
   * @param {number} stage A `ShaderType`.
   * @param {number} registerIndex The register.
   * @returns {boolean} Whether the slot took the binding.
   * Carbon declaration: Tr2RuntimeTextureParameter::ApplyUav (trinity/trinity/Shader/Parameter/Tr2RuntimeTextureParameter.h:24).
   */
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
   *
   * @implemented
   */

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
   *
   * @implemented
   */

  GetTextureProvider()
  {
    return this.texture;
  }

  /**
   * Sets the mip level to use when this texture is bound as an unordered-access
   * view, coerced to uint32.
   *
   * @implemented
   */

  SetUavMipLevel(mipLevel)
  {
    this.uavMipLevel = mipLevel >>> 0;
  }

  /**
   * Registers a material to be invalidated when this parameter changes;
   * duplicates are ignored.
   *
   * @implemented
   */

  OnAddedToMaterial(material)
  {
    if (!this._materials.includes(material))
    {
      this._materials.push(material);
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
   * The cast is to a resource as Carbon's `BlueCastPtr` does. A provider that is
   * not one but owns device objects - a render target or depth stencil - is a
   * Tr2DeviceResource and is renewed as one; a texture reference is neither and
   * holds nothing to renew.
   *
   * @cjs
   * @adapted
   */
  KeepAlive()
  {
    const resource = CjsSchema.cast(this.texture, IBlueResource);
    if (resource)
    {
      resource.KeepAlive();
      return;
    }

    const deviceResource = CjsSchema.cast(this.texture, Tr2DeviceResource);
    if (deviceResource) deviceResource.KeepAlive();
  }

  /**
   * Stops tracking a material so later texture changes no longer invalidate its resource sets.
   *
   * @implemented
   */

  OnRemovedFromMaterial(material)
  {
    const index = this._materials.indexOf(material);
    if (index >= 0)
    {
      this._materials.splice(index, 1);
    }
  }

  /** Invalidates every attached material directly (Tr2RuntimeTextureParameter.cpp:17-27). */
  _invalidateResourceSets()
  {
    for (const material of this._materials)
    {
      material.InvalidateResourceSets();
    }
  }
}

// Exact identities from Tr2RuntimeTextureParameter_Blue.cpp; no exposure chain.

