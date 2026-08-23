// Source: trinity/trinity/Shader/Parameter/Tr2TextureAnimationParameter.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { carbon, impl, io, type } from "#schema";
import { CjsParameter } from "./CjsParameter.js";

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
   * Always false - populating a resource set is device work this package does
   * not do.
   */
  @carbon.method
  @impl.adapted
  CopyToResourceSet()
  {
    return false;
  }

  /** Always false - UAV binding is left to the engine adapter. */
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
