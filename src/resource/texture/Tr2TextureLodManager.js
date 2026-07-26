// Source: trinity/trinity/Resources/Tr2TextureLodManager.h
// Source: trinity/trinity/Resources/Tr2TextureLodManager.cpp
// Source: trinity/trinity/Resources/Tr2TextureLodManager_Blue.cpp
import { carbon, impl, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

/**
 * CPU-side registry for texture resources participating in LOD management.
 *
 * Carbon also accounts for device memory in this class. CarbonEngineJS keeps
 * device allocation and budget policy in engine packages, so this runtime
 * class owns only deterministic resource membership.
 */
@type.define({ className: "Tr2TextureLodManager", family: "resources" })
export class Tr2TextureLodManager extends CjsModel
{

  /** gpuMemoryUsed (size_t) */
  @type.uint64
  gpuMemoryUsed = 0;

  /** gpuMemoryAllocated (size_t) */
  @type.uint64
  gpuMemoryAllocated = 0;

  /** cpuMemoryUsed (size_t) */
  @type.uint64
  cpuMemoryUsed = 0;

  /** cpuMemoryAllocated (size_t) */
  @type.uint64
  cpuMemoryAllocated = 0;

  /** gpuUploadSize (size_t) */
  @type.uint64
  gpuUploadSize = 0;

  /** m_gpuMemorySize (CcpAtomic<uint32_t>) */
  @type.unknown
  gpuMemorySize = 0;

  /** m_cpuMemorySize (CcpAtomic<uint32_t>) */
  @type.unknown
  cpuMemorySize = 0;

  /** m_currentStats (Stats) */
  @type.rawStruct("Stats")
  currentStats = null;

  /** m_lowDetailVtaFiles (bool) */
  @type.boolean
  lowDetailVtaFiles = false;

  #textures = [];

  /** Creates a Tr2TextureLodManager with caller-provided initial state. */
  constructor(values = null)
  {
    super();
    this.SetValues(values || {}, {
      markDirty: false,
      skipUpdate: true,
      skipEvents: true
    });
  }

  /**
   * Append one texture to the managed list in registration order.
   *
   * @param {object} texture Texture resource.
   * @returns {Tr2TextureLodManager} This manager.
   */
  @carbon.method
  @impl.implemented
  RegisterTexture(texture)
  {
    if (!texture || (typeof texture !== "object" && typeof texture !== "function"))
    {
      throw new TypeError("Tr2TextureLodManager.RegisterTexture requires a texture object.");
    }
    this.#textures.push(texture);
    return this;
  }

  /**
   * Remove a registered texture.
   *
   * @param {object} texture Texture resource.
   * @returns {Tr2TextureLodManager} This manager.
   */
  @carbon.method
  @impl.implemented
  UnregisterTexture(texture)
  {
    this.#textures = this.#textures.filter(entry => entry !== texture);
    return this;
  }

  /**
   * Return a snapshot of registered texture resources.
   *
   * @returns {object[]} Registered textures in Carbon registration order.
   */
  @carbon.method
  @impl.implemented
  GetManagedTextures()
  {
    return this.#textures.slice();
  }

}
