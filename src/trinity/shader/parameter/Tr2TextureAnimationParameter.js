// Source: trinity/trinity/Shader/Parameter/Tr2TextureAnimationParameter.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { carbon, impl, io, type } from "#schema";
import { Tr2ColorSpace } from "#consts/render-context";
import { CjsParameter } from "./CjsParameter.js";
import { ResourceFlags } from "./ITr2EffectValue.js";

/** Exposes one named channel of a texture animation as a shader resource and invalidates attached materials as it changes. */
@type.define({ className: "Tr2TextureAnimationParameter", family: "shader" })
export class Tr2TextureAnimationParameter extends CjsParameter
{

  /** m_animation (Tr2TextureAnimationPtr) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.objectRef("Tr2TextureAnimation")
  animation = null;

  /** m_channel (BlueSharedString) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  channel = "";

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  resourceType = 0;

  #materials = [];

  /** The shader resource name the animated texture binds to. */
  @carbon.method
  @impl.implemented
  GetParameterName()
  {
    return this.name;
  }

  /** Content hash: the animation object's identity (Carbon hashes its pointer). */
  @carbon.method
  @impl.adapted
  GetHashValue(startingHash = CjsParameter.FNV1_INITIAL)
  {
    return CjsParameter.hashFnv1Identity(this.animation, startingHash);
  }

  /**
   * Marks every attached material's resource sets and constant buffers dirty
   * after the animation reference changed.
   */
  @carbon.method
  @impl.adapted
  OnModified(_options = {})
  {
    for (const material of this.#materials)
    {
      CjsParameter.markMaterialResourcesDirty(material);
    }
    return true;
  }

  /**
   * Caches the reflected resource type for this name when the shader exposes
   * one, and leaves the previous type in place otherwise; no GPU binding is
   * created.
   */
  @carbon.method
  @impl.adapted
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
   * ONE DIVERGENCE, AND IT IS THE FALLBACK. With no animation attached Carbon
   * binds `Tr2Renderer::GetFallbackTexture( m_resourceType, m_name )` — a
   * magenta stand-in picked by texture dimensionality, so a missing texture
   * draws visibly wrong rather than invisibly. We bind nothing, because
   * `GetFallbackTexture` is a `Tr2Renderer` STATIC reaching process-global
   * fallback textures, and ours is an instance the composition root creates
   * (see the head comment on `Tr2Renderer`) that a parameter holds no
   * reference to. Reaching it would mean widening Carbon's signature.
   *
   * Binding an empty srv is what Carbon itself does in the equivalent
   * no-provider case in `TriVariable::CopyToResourceSet`, so this is a
   * degraded diagnostic rather than a behavioural difference in what draws.
   *
   * @param {object} resourceDesc A `Tr2ResourceSetDescriptionAL`.
   * @param {number} stage A `ShaderType`.
   * @param {number} registerIndex The register.
   * @param {number} [flags] A `ResourceFlags` word; bit 0 is sRGB.
   * @returns {boolean} Whether the slot took the binding.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon's fallback texture comes from a Tr2Renderer static; ours is an instance a parameter cannot reach without widening Carbon's signature.")
  CopyToResourceSet(resourceDesc, stage, registerIndex, flags = 0)
  {
    const colorSpace = (flags & ResourceFlags.RESOURCE_FLAG_SRGB)
      ? Tr2ColorSpace.COLOR_SPACE_SRGB
      : Tr2ColorSpace.COLOR_SPACE_LINEAR;

    return resourceDesc.SetSrv(stage, registerIndex, this.GetTexture(), colorSpace);
  }

  /**
   * Always false, and Carbon's is too: an animated texture is sampled, never
   * written, so it has no unordered-access binding.
   *
   * @returns {boolean} False, always.
   */
  @carbon.method
  @impl.implemented
  ApplyUav()
  {
    return false;
  }

  /**
   * Registers a material to be dirtied when the animation changes; duplicates
   * are ignored.
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
   * Drops a material from the tracked list, so later frame advances no longer
   * mark it dirty.
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

  /**
   * The animation's texture for this parameter's channel, or null when no
   * animation is attached.
   */
  @carbon.method
  @impl.adapted
  GetTexture()
  {
    return this.animation?.GetTexture?.(this.channel) ?? this.animation?.getTexture?.(this.channel) ?? null;
  }

}
