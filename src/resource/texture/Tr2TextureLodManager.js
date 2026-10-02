import "#blue/values";
// Source: trinity/trinity/Resources/Tr2TextureLodManager.h
// Source: trinity/trinity/Resources/Tr2TextureLodManager.cpp
// Source: trinity/trinity/Resources/Tr2TextureLodManager_Blue.cpp
import { CjsSchema, meta } from "#schema";

/**
 * CPU-side registry for texture resources participating in LOD management.
 *
 * Carbon also accounts for device memory in this class. CarbonEngineJS keeps
 * device allocation and budget policy in engine packages, so this runtime
 * class owns only deterministic resource membership.
 */
export class Tr2TextureLodManager
{

  /** gpuMemoryUsed (size_t) */
  gpuMemoryUsed = 0;

  /** gpuMemoryAllocated (size_t) */
  gpuMemoryAllocated = 0;

  /** cpuMemoryUsed (size_t) */
  cpuMemoryUsed = 0;

  /** cpuMemoryAllocated (size_t) */
  cpuMemoryAllocated = 0;

  /** gpuUploadSize (size_t) */
  gpuUploadSize = 0;

  /** m_gpuMemorySize (CcpAtomic<uint32_t>) */
  gpuMemorySize = 0;

  /** m_cpuMemorySize (CcpAtomic<uint32_t>) */
  cpuMemorySize = 0;

  /** m_currentStats (Stats) */
  currentStats = null;

  /** m_lowDetailVtaFiles (bool) */
  lowDetailVtaFiles = false;

  _textures = [];

  /** Creates a Tr2TextureLodManager with caller-provided initial state. */
  constructor(values = null)
  {
    CjsSchema.setValues(this, values || {}, {
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
  RegisterTexture(texture)
  {
    if (!texture || (typeof texture !== "object" && typeof texture !== "function"))
    {
      throw new TypeError("Tr2TextureLodManager.RegisterTexture requires a texture object.");
    }
    this._textures.push(texture);
    return this;
  }

  /**
   * Remove a registered texture.
   *
   * @param {object} texture Texture resource.
   * @returns {Tr2TextureLodManager} This manager.
   */
  UnregisterTexture(texture)
  {
    this._textures = this._textures.filter(entry => entry !== texture);
    return this;
  }

  /**
   * Return a snapshot of registered texture resources.
   *
   * @returns {object[]} Registered textures in Carbon registration order.
   */
  GetManagedTextures()
  {
    return this._textures.slice();
  }

}

CjsSchema.define(Tr2TextureLodManager, {
  className: "Tr2TextureLodManager", family: "resources",
  fields: {
    gpuMemoryUsed: meta.type.uint64,
    gpuMemoryAllocated: meta.type.uint64,
    cpuMemoryUsed: meta.type.uint64,
    cpuMemoryAllocated: meta.type.uint64,
    gpuUploadSize: meta.type.uint64,
    gpuMemorySize: meta.type.unknown,
    cpuMemorySize: meta.type.unknown,
    currentStats: meta.type.rawStruct("Stats"),
    lowDetailVtaFiles: meta.type.boolean
  },
  methods: {
    RegisterTexture: [ meta.blue.method, meta.implemented ],
    UnregisterTexture: [ meta.blue.method, meta.implemented ],
    GetManagedTextures: [ meta.blue.method, meta.implemented ]
  }
});
