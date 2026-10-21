import { exposure as be } from "#be";
// Source: trinity/trinity/Shader/Parameter/Tr2TextureAnimationParameter.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { IsMatch, INotify } from "#blue";
import { meta, type, blue } from "#schema";
import { Tr2ColorSpace } from "#consts/render-context";
import { CjsParameter } from "./CjsParameter.js";
import { ITriEffectResourceParameter } from "./ITriEffectResourceParameter.js";
import { ResourceFlags } from "./ITr2EffectValue.js";

/** Exposes one named channel of a texture animation as a shader resource and invalidates attached materials as it changes. */
@be.define("Tr2TextureAnimationParameter")
@blue.inherit(ITriEffectResourceParameter, INotify)
@be.mapInterface(ITriEffectResourceParameter)
@be.mapInterface(INotify)
export class Tr2TextureAnimationParameter extends CjsParameter
{

  /** m_animation (Tr2TextureAnimationPtr) [READWRITE, PERSIST, NOTIFY] */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.rootRef("Tr2TextureAnimation")
  animation = null;

  /** m_channel (BlueSharedString) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  channel = "";

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "";

  resourceType = 0;

  _materials = [];

  /** The shader resource name the animated texture binds to. */

  @meta.implemented
  GetParameterName()
  {
    return this.name;
  }

  /** Content hash: the animation object's identity (Carbon hashes its pointer). */

  @meta.adapted
  GetHashValue(startingHash = CjsParameter.FNV1_INITIAL)
  {
    return CjsParameter.hashFnv1Identity(this.animation, startingHash);
  }

  /**
   * Invalidates each registered material's resource sets on an animation edit.
   */

  @meta.implemented
  OnModified(propertyName)
  {
    if (!IsMatch(propertyName, "animation")) return true;
    for (const material of this._materials)
    {
      material.InvalidateResourceSets();
    }
    return true;
  }

  /**
   * Caches the reflected resource type for this name when the shader exposes
   * one, and leaves the previous type in place otherwise; no GPU binding is
   * created.
   */

  @meta.adapted
  RebuildEffectHandles(effectRes)
  {
    const resource = this.name ? CjsParameter.getEffectResource(effectRes, this.name) : null;
    if (resource)
    {
      this.resourceType = resource.type ?? this.resourceType;
    }
  }

  /**
   * Binds the animation's current channel texture.
   *
   * Carbon `Tr2TextureAnimationParameter::CopyToResourceSet`.
   *
   * Adapted: Uses the runtime texture interface. When no animation is attached,
   * the native renderer fallback texture is still missing, so this binds null.
   * This changes missing-texture rendering and remains an implementation gap.
   *
   * @param {object} resourceDesc A `Tr2ResourceSetDescriptionAL`.
   * @param {number} stage A `ShaderType`.
   * @param {number} registerIndex The register.
   * @param {number} [flags] A `ResourceFlags` word; bit 0 is sRGB.
   * @returns {boolean} Whether the slot took the binding.
   */
  @blue.method
  @meta.adapted
  CopyToResourceSet(resourceDesc, stage, registerIndex, flags = 0)
  {
    const colorSpace = (flags & ResourceFlags.RESOURCE_FLAG_SRGB)
      ? Tr2ColorSpace.COLOR_SPACE_SRGB
      : Tr2ColorSpace.COLOR_SPACE_LINEAR;

    return resourceDesc.SetSrv__TextureAL(stage, registerIndex, this.GetTexture(), colorSpace);
  }

  /**
   * Always false, and Carbon's is too: an animated texture is sampled, never
   * written, so it has no unordered-access binding.
   *
   * @returns {boolean} False, always.
   */
  @blue.method
  @meta.implemented
  ApplyUav()
  {
    return false;
  }

  /**
   * Registers one material occurrence for animation-reference invalidation.
   */

  @meta.implemented
  OnAddedToMaterial(material)
  {
    this._materials.push(material);
  }

  /**
   * Removes the first matching material registration, retaining duplicates.
   */

  @meta.implemented
  OnRemovedFromMaterial(material)
  {
    const index = this._materials.indexOf(material);
    if (index >= 0)
    {
      this._materials.splice(index, 1);
    }
  }

  /**
   * The animation's texture for this parameter's channel, or null when no
   * animation is attached.
   */

  @meta.adapted
  GetTexture()
  {
    return this.animation ? this.animation.GetTexture(this.channel) : null;
  }

}

// Exact identities from Tr2TextureAnimationParameter_Blue.cpp; no exposure chain.
