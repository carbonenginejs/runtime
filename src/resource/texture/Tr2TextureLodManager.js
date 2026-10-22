import { exposure as be } from "#be";
import { IRoot } from "#blue/IRoot";
import { IBlueEvents } from "#blue/IBlueEvents";
import "#blue/values";
// Source: trinity/trinity/Resources/Tr2TextureLodManager.h
// Source: trinity/trinity/Resources/Tr2TextureLodManager.cpp
// Source: trinity/trinity/Resources/Tr2TextureLodManager_Blue.cpp
import { CjsSchema, meta, type, blue } from "#schema";

/**
 * CPU-side registry for texture resources participating in LOD management.
 *
 * Carbon also accounts for device memory in this class. CarbonEngineJS keeps
 * device allocation and budget policy in engine packages, so this runtime
 * class owns only deterministic resource membership.
 */
export class Tr2TextureLodManager extends IRoot
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

CjsSchema.blue.inherit(IRoot, IBlueEvents)(Tr2TextureLodManager);

CjsSchema.decorateField(Tr2TextureLodManager, "gpuMemoryUsed", type.uint64);
CjsSchema.decorateField(Tr2TextureLodManager, "gpuMemoryAllocated", type.uint64);
CjsSchema.decorateField(Tr2TextureLodManager, "cpuMemoryUsed", type.uint64);
CjsSchema.decorateField(Tr2TextureLodManager, "cpuMemoryAllocated", type.uint64);
CjsSchema.decorateField(Tr2TextureLodManager, "gpuUploadSize", type.uint64);
CjsSchema.decorateField(Tr2TextureLodManager, "gpuMemorySize", type.uint32);
CjsSchema.decorateField(Tr2TextureLodManager, "cpuMemorySize", type.uint32);
CjsSchema.decorateField(Tr2TextureLodManager, "currentStats", type.rawStruct("Stats"));
CjsSchema.decorateField(Tr2TextureLodManager, "lowDetailVtaFiles", type.boolean);
CjsSchema.decorateMethod(Tr2TextureLodManager, "RegisterTexture", meta.implemented);
CjsSchema.decorateMethod(Tr2TextureLodManager, "UnregisterTexture", meta.implemented);
CjsSchema.decorateMethod(Tr2TextureLodManager, "GetManagedTextures", be.mapMethodAndWrap(), meta.implemented);
CjsSchema.exposure.abstract(Tr2TextureLodManager);
be.define("Tr2TextureLodManager")(Tr2TextureLodManager);
