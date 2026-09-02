// An effect's named texture to a realized WebGPU texture.
//
// This is the last link of the chain and the one that was genuinely missing.
// Both ends already worked: the format readers decode dds, png, jpeg, tga, gif
// and webp, and CjsWebgpuDevice realizes a published payload. Nothing joined
// them, because `TriTextureParameter.SetResource` is never called from src, so
// an authored texture path never became a bound texture.
//
// Carbon binds an already-created texture: TriTextureParameter holds
// `m_cachedTexture` and CopyToResourceSet hands it straight to the resource-set
// description (TriTextureParameter.cpp:177-186). Realization happened when the
// resource loaded, long before the draw.
//
// A BROWSER CANNOT DO THAT, and this is the one honest deviation. A texture
// arrives over the network, so the first frame that wants it may be earlier
// than the frame that has it. Resolution is therefore asynchronous and
// idempotent: the same name resolves to the same texture for the life of the
// resource, and a caller awaits once rather than polling.
//
// The sRGB flag travels with the binding, not with the texture: the same bytes
// are read as colour by one effect and as data by another, which is why Carbon
// carries it in the resource FLAGS rather than in the texture. See
// /docs/contracts/texture-sampler-pairing.md for why the sampler pairing cannot
// come from here.
import { ResourceRequirement } from "#resource/ResourceRequirement";


function fail(message)
{
  const error = new Error(`CjsWebgpuTextureSource: ${message}`);
  error.code = "CJS_WEBGPU_TEXTURE_SOURCE_INVALID";
  throw error;
}


/** Resolves an effect's named textures against one device and resource manager. */
export class CjsWebgpuTextureSource
{
  #webgpu;

  #resourceManager;

  #adapterKey;

  /** Resource path to the in-flight or settled realization. */
  #realized = new Map();

  /**
   * @param {object} webgpu Canonical WebGPU device.
   * @param {object} options Composition.
   * @param {object} options.resourceManager Loads textures by path.
   * @param {string} [options.adapterKey] Adapter slot the realization publishes into.
   */
  constructor(webgpu, options = {})
  {
    if (!webgpu) fail("a WebGPU device is required");
    if (!options.resourceManager) fail("a resource manager is required to load textures by path");

    this.#webgpu = webgpu;
    this.#resourceManager = options.resourceManager;
    this.#adapterKey = options.adapterKey ?? "webgpu";
  }

  /**
   * The realized texture for one of an effect's named resources.
   *
   * Named rather than pathed, because the shader binds by name and only the
   * effect knows which file that name currently points at - a skin changes the
   * path and not the name.
   *
   * @param {string} name Effect resource name, as the shader declares it.
   * @param {object} material Trinity material owning the resource.
   * @returns {Promise<object>} Realized texture bundle.
   */
  async Resolve(name, material)
  {
    const parameter = material?.GetResourceByName?.(name) ?? null;

    if (!parameter)
    {
      fail(`effect declares no resource named "${name}", so nothing says which file to bind`);
    }

    const path = parameter.resourcePath ?? parameter.GetResourcePath?.() ?? "";

    if (!path)
    {
      fail(`effect resource "${name}" names no path; an unset texture cannot be bound`);
    }

    const existing = this.#realized.get(path);

    // Shared rather than re-entered: two batches binding the same texture in one
    // frame is the ordinary case, and realizing it twice would allocate twice.
    if (existing) return existing;

    const realization = this.#Realize(path, name);

    this.#realized.set(path, realization);

    return realization;
  }

  /**
   * Loads and realizes one texture path.
   *
   * @param {string} path Resource path.
   * @param {string} name Effect resource name, for diagnostics.
   * @returns {Promise<object>} Realized bundle.
   */
  async #Realize(path, name)
  {
    const resource = this.#resourceManager.GetResource(path, {
      requirement: ResourceRequirement.TEXTURE
    });

    if (!resource) fail(`no resource for "${name}" at ${JSON.stringify(path)}`);

    // The resource publishes its CPU payload before an adapter can be made from
    // it; a texture still in flight is not an error, it is the normal first
    // frame.
    await resource.Ready?.();

    return this.#webgpu.RealizeRgba8Texture(resource, {
      textureKey: name,
      bundleLabel: `effect texture ${name}`,
      adapterKey: this.#adapterKey
    });
  }

  /**
   * A resolver hook bound to this source.
   *
   * @returns {Function} `(name, material) => Promise<object>`
   */
  ResolveTexture()
  {
    return (name, material) => this.Resolve(name, material);
  }

  /** Forgets every realization, so a device loss can rebuild them. */
  Clear()
  {
    this.#realized.clear();
  }
}
