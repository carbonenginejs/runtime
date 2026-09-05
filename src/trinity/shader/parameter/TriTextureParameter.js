// Source: trinity/trinity/Shader/Parameter/TriTextureParameter.h
// Source: trinity/trinity/Shader/Parameter/TriTextureParameter.cpp
import { carbon, impl, io, type } from "#schema";
import { CjsModel } from "#model";
import { Tr2ColorSpace } from "#consts/render-context";
import { CjsParameter } from "./CjsParameter.js";
import { ResourceFlags } from "./ITr2EffectValue.js";


/**
 * A named texture slot on an effect, owning the authored res path, the resolved
 * texture provider and the UV-density scales that drive mip selection.
 */
@type.define({
  className: "TriTextureParameter",
  family: "shader"
})
export class TriTextureParameter extends CjsParameter
{
  @io.flag("resource")
  @io.notify
  @io.persist
  @type.path
  resourcePath = "";

  @io.persist
  @type.uint32
  uavMipLevel = 0;

  @io.read
  @type.float32
  positionScale = 0;

  @io.read
  @type.objectRef("ITr2TextureProvider")
  resource = null;

  @io.read
  @type.boolean
  usedByCurrentTechnique = false;

  @io.read
  @type.boolean
  usedByCurrentEffect = false;

  @io.flag("effectHandles")
  @io.notify
  @io.persist
  @type.string
  name = "";

  @io.read
  @type.float32
  uvDensityScale0 = 0;

  @io.read
  @type.float32
  uvDensityScale1 = 0;

  @io.read
  @type.float32
  uvDensityScale2 = 0;

  @io.read
  @type.float32
  uvDensityScale3 = 0;

  #cachedEffect = null;

  #lowResResource = null;

  #materials = [];

  #textureLodEnabled = false;

  /** The shader resource name this texture binds to. */
  @carbon.method
  @impl.implemented
  GetParameterName()
  {
    return this.name;
  }

  /** Content hash: resource path (when set) then name. */
  @carbon.method
  @impl.adapted
  GetHashValue(startingHash = CjsParameter.FNV1_INITIAL)
  {
    if (this.resourcePath)
    {
      startingHash = CjsParameter.hashFnv1String(this.resourcePath, startingHash);
    }
    return CjsParameter.hashFnv1String(this.name, startingHash);
  }

  /**
   * Sets the name through SetValues so the effectHandles rebuild flag fires;
   * returns whether it changed.
   */
  @carbon.method
  @impl.adapted
  SetParameterName(name)
  {
    return this.SetValues({ name: String(name) }, { source: this, returnBoolean: true });
  }

  /**
   * The path of the currently attached texture when it exposes one, falling back
   * to the authored resourcePath - so after a redirect this can differ from what
   * was authored.
   */
  @carbon.method
  @impl.adapted
  GetResourcePath()
  {
    const resource = this.GetResource();
    return resource?.GetPath?.() ?? resource?.path ?? resource?.resourcePath ?? this.resourcePath;
  }

  /**
   * Sets the authored path and raises the resource flag, so the next OnModified
   * drops the attached texture and asks for it again.
   */
  @carbon.method
  @impl.adapted
  SetResourcePath(resourcePath)
  {
    this.SetValues({ resourcePath: String(resourcePath) }, { source: this });
  }

  /**
   * Attaches a resolved texture provider, discards any low-res stand-in,
   * re-resolves effect handles against the cached shader and notifies owning
   * materials.
   */
  @carbon.method
  @impl.adapted
  SetResource(resource)
  {
    if (this.resource !== resource)
    {
      this.resource = resource;
    }
    this.#lowResResource = null;
    this.RebuildEffectHandles(this.#cachedEffect);
    this.OnTextureChanged();
  }

  /**
   * The texture actually in use: the low-res stand-in while one is active,
   * otherwise the resolved resource.
   */
  @carbon.method
  @impl.adapted
  GetResource()
  {
    return this.#lowResResource ?? this.resource;
  }

  /**
   * Binds this parameter's texture into a resource-set description.
   *
   * Carbon `TriTextureParameter::CopyToResourceSet`
   * (`Shader/Parameter/TriTextureParameter.cpp`), which is this and nothing
   * else. THE CLASS HAD NO SUCH METHOD AT ALL until 2026-09-05 — the three
   * lesser texture parameters at least carried a `return false` stub, while
   * the main texture-bearing one carried nothing, so nothing bound.
   *
   * `flags` is Carbon's `ResourceFlags`, which a mapped resource stores in
   * `registerCount` — for a resource that field is a flag word, not a count.
   *
   * @param {object} resourceDesc A `Tr2ResourceSetDescriptionAL`.
   * @param {number} stage A `ShaderType`.
   * @param {number} registerIndex The register.
   * @param {number} [flags] A `ResourceFlags` word; bit 0 is sRGB.
   * @returns {boolean} Whether the slot took the binding.
   */
  @carbon.method
  @impl.implemented
  CopyToResourceSet(resourceDesc, stage, registerIndex, flags = 0)
  {
    const colorSpace = (flags & ResourceFlags.RESOURCE_FLAG_SRGB)
      ? Tr2ColorSpace.COLOR_SPACE_SRGB
      : Tr2ColorSpace.COLOR_SPACE_LINEAR;

    // Carbon binds `m_cachedTexture`, which is the low-res stand-in while one
    // is active. `GetResource` already answers that question here.
    return resourceDesc.SetSrv(stage, registerIndex, this.GetResource(), colorSpace);
  }

  /**
   * Binds this parameter's texture as an unordered-access view at its mip.
   *
   * Carbon `TriTextureParameter::ApplyUav` (same file). No colour space: a UAV
   * is written, not sampled, so there is no transfer function to apply.
   *
   * @param {object} resourceDesc A `Tr2ResourceSetDescriptionAL`.
   * @param {number} stage A `ShaderType`.
   * @param {number} registerIndex The register.
   * @returns {boolean} Whether the slot took the binding.
   */
  @carbon.method
  @impl.implemented
  ApplyUav(resourceDesc, stage, registerIndex)
  {
    return resourceDesc.SetUav(stage, registerIndex, this.GetResource(), this.uavMipLevel);
  }

  /** Always true - a texture swap must dirty the owning materials' resource sets. */
  @carbon.method
  @impl.implemented
  SupportsDirtyNotification()
  {
    return true;
  }

  /**
   * Turns on screen-size-driven mip selection and stores the density scales; Carbon's spelling of the method name is kept.
   * @param uvDensityScale five scales: the world-position scale first, then the four UV-set scales
   */
  @carbon.method
  @impl.adapted
  EnableTextureLoding(uvDensityScale)
  {
    this.#textureLodEnabled = true;
    this.positionScale = Number(uvDensityScale[0] ?? 0);
    this.uvDensityScale0 = Number(uvDensityScale[1] ?? 0);
    this.uvDensityScale1 = Number(uvDensityScale[2] ?? 0);
    this.uvDensityScale2 = Number(uvDensityScale[3] ?? 0);
    this.uvDensityScale3 = Number(uvDensityScale[4] ?? 0);
  }

  /** Turns mip selection off, so UsedWithScreenSize then always requests LOD 0. */
  @carbon.method
  @impl.implemented
  DisableTextureLoding()
  {
    this.#textureLodEnabled = false;
  }

  /**
   * Carbon TriTextureParameter::UsedWithScreenSize (cpp:53-97): takes the largest resolution demanded by the world-position and per-UV-set densities, compares it against the texture's native resolution, and asks the resource for the resulting mip level.
   * @returns {number} the requested LOD, 0 when LOD is disabled or no density applies
   */
  @carbon.method
  @impl.adapted
  UsedWithScreenSize(screenSize, worldRadius, uvDensities = [])
  {
    if (!this.#textureLodEnabled)
    {
      this.#requestResourceResolution(0);
      return 0;
    }
    let resolution = 0;
    const positionDensity = worldRadius * Number(this.positionScale ?? 0);
    if (positionDensity > 0)
    {
      resolution = Math.max(resolution, screenSize / positionDensity);
    }
    const scales = [Number(this.uvDensityScale0 ?? 0), Number(this.uvDensityScale1 ?? 0), Number(this.uvDensityScale2 ?? 0), Number(this.uvDensityScale3 ?? 0)];
    for (let i = 0; i < Math.min(uvDensities.length, scales.length); i++)
    {
      const density = Number(uvDensities[i]) * scales[i];
      if (density > 0)
      {
        resolution = Math.max(resolution, screenSize / density);
      }
    }
    let requestedLod = 0;
    const resource = this.GetResource();
    const original = resource?.GetOriginalResolutionAsFloat?.() ?? 0;
    if (resolution > 0 && original > 0)
    {
      const requestedResolution = Math.max(1, resolution);
      const resolutionChange = Math.floor(original / requestedResolution);
      if (resolutionChange > 0)
      {
        requestedLod = Math.floor(Math.log2(resolutionChange));
      }
    }
    this.#requestResourceResolution(requestedLod);
    return requestedLod;
  }

  /**
   * Consumes the two dirty flags: `resource` drops the attached texture and
   * re-initializes, `effectHandles` re-resolves against the cached shader.
   */
  @carbon.method
  @impl.adapted
  OnModified(_options = {})
  {
    const flags = this.__state.flags;
    if (flags.delete("resource"))
    {
      this.resource = null;
      this.#lowResResource = null;
      this.Initialize();
    }
    if (flags.delete("effectHandles"))
    {
      this.RebuildEffectHandles(this.#cachedEffect);
    }
    return true;
  }

  /**
   * Nothing to do in this GPU-free package - res paths are never resolved to
   * texture bytes here; returns true so callers can treat initialization as
   * successful.
   */
  @carbon.method
  @impl.adapted
  Initialize()
  {
    return true;
  }

  /**
   * Caches the shader and records whether it exposes a resource or constant of
   * this name; no GPU binding is created.
   */
  @carbon.method
  @impl.adapted
  RebuildEffectHandles(effectRes)
  {
    this.#cachedEffect = effectRes;
    const used = !!this.name && (CjsParameter.hasEffectResource(effectRes, this.name) || CjsParameter.hasEffectConstant(effectRes, this.name));
    this.usedByCurrentEffect = used;
    this.usedByCurrentTechnique = used;
  }

  /**
   * Registers a material to be notified when the texture changes; duplicates are
   * ignored.
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
   * Stops notifying a material; the material reference is dropped, not the
   * texture.
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
   * Tells every owning material that its resource sets and constant buffers are
   * stale.
   */
  @carbon.method
  @impl.adapted
  OnTextureChanged()
  {
    for (const material of this.#materials)
    {
      const target = material;
      target?.ResourceChanged?.();
      target?.MarkConstantBuffersDirty?.();
    }
  }

  /**
   * Asks the texture currently in use for a mip level, if it supports resolution
   * requests.
   */
  #requestResourceResolution(lod)
  {
    const target = this.GetResource();
    target?.RequestResolution?.(lod);
  }

  /** JS convenience: raw values this parameter class claims for map-form inference. */
  static isValue(value)
  {
    return typeof value === "string";
  }

}
