import { exposure as be } from "#be";
import { IRoot } from "#blue/IRoot";
import { IBlueEvents } from "#blue/IBlueEvents";
import "#blue/values";
// Source: trinity/trinity/Resources/Tr2TextureLodManager.h
// Source: trinity/trinity/Resources/Tr2TextureLodManager.cpp
// Source: trinity/trinity/Resources/Tr2TextureLodManager_Blue.cpp
import { CjsSchema, meta, type, blue } from "#schema";
import { blue as service } from "#blue";
import { Tr2TextureLodUpdateRequest } from "./Tr2TextureLodUpdateRequest.js";

/**
 * Carbon: GetTextureSize (Tr2TextureLodManager.cpp:20-28), file-local. The byte size of every
 * mip of a bitmap times its array size, in uint32 arithmetic as Carbon accumulates it.
 *
 * @param {object} desc A Tr2BitmapDimensions (ImageIO BitmapDimensions).
 * @returns {number} The size in bytes, wrapped to 32 bits.
 */
function GetTextureSize(desc)
{
  let size = 0;
  for (let i = 0; i < desc.GetTrueMipCount(); ++i)
  {
    size = (size + desc.GetMipSize(i)) >>> 0;
  }
  return Math.imul(size, Math.max(1, desc.GetArraySize())) >>> 0;
}

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

  /**
   * m_textures (std::vector<std::pair<TriTextureRes*, Tr2TextureLodUpdateRequest>>): each
   * managed texture with its LOD update request, in registration order (Tr2TextureLodManager.h:56).
   */
  _textures = [];

  /**
   * s_gpuMemoryBudget (Tr2TextureLodManager.cpp:15), TRI_REGISTER_SETTING "textureLodGpuBudget"
   * (cpp:32): the GPU texture memory, in bytes, above which textures are trimmed.
   */
  @meta.setting("textureLodGpuBudget")
  @meta.implemented
  static textureLodGpuBudget = 300 * 1024 * 1024;

  /**
   * s_cpuMemoryBudget (Tr2TextureLodManager.cpp:16), TRI_REGISTER_SETTING "textureLodCpuBudget"
   * (cpp:33): the CPU texture memory, in bytes, above which textures are trimmed.
   */
  @meta.setting("textureLodCpuBudget")
  @meta.implemented
  static textureLodCpuBudget = 200 * 1024 * 1024;

  /**
   * s_lodChanges (Tr2TextureLodManager.cpp:17), TRI_REGISTER_SETTING "textureLodChanges"
   * (cpp:34): the LOD changes OnTick applies per tick for textures cached in RAM.
   */
  @meta.setting("textureLodChanges")
  @meta.implemented
  static textureLodChanges = 4;

  /**
   * s_loadRequests (Tr2TextureLodManager.cpp:18), TRI_REGISTER_SETTING "textureLoadRequests"
   * (cpp:35): the load requests OnTick issues per tick for textures not cached in RAM.
   */
  @meta.setting("textureLoadRequests")
  @meta.implemented
  static textureLoadRequests = 2;

  /** The singleton Instance() creates (Tr2TextureLodManager.cpp:60, function-local static). */
  @meta.adapted
  static _instance = null;

  /**
   * Carbon: Tr2TextureLodManager::Tr2TextureLodManager (Tr2TextureLodManager.cpp:50-56), protected.
   * Starts with an empty Stats record.
   *
   * Adapted: Carbon's constructor registers the manager for ticks. A JavaScript constructor
   * cannot be protected and schema tooling may construct instances freely, so the
   * RegisterForTicks call is made by Instance(), the only creator Carbon allows.
   */
  constructor()
  {
    super();
    this.currentStats = { gpuMemoryUsed: 0, gpuMemoryAllocated: 0, cpuMemoryUsed: 0, cpuMemoryAllocated: 0, gpuUploadSize: 0 };
  }

  /**
   * Carbon: Tr2TextureLodManager::Instance (Tr2TextureLodManager.cpp:58-62). The process-wide
   * manager, created on first use and registered for ticks.
   *
   * @returns {Tr2TextureLodManager} The manager.
   */
  static Instance()
  {
    if (!Tr2TextureLodManager._instance)
    {
      const manager = new Tr2TextureLodManager();
      service.os.RegisterForTicks(manager, null);
      Tr2TextureLodManager._instance = manager;
    }
    return Tr2TextureLodManager._instance;
  }

  /**
   * Carbon: Tr2TextureLodManager::OnTick (Tr2TextureLodManager.cpp:64-124), IBlueEvents.
   * Asks every texture for its LOD request, orders the requests (shrinks first, then most
   * recently asked first), and processes up to the per-tick budget of changes and loads.
   *
   * Not implemented: it drives TriTextureRes.UpdateLodRequest and
   * TriTextureRes.ProcessLodRequest, which TriTextureRes does not carry yet. The loop is
   * Carbon's and is empty while nothing is registered.
   *
   * @param {number} _realTime Real time in ticks.
   * @param {number} _simTime Simulation time in ticks.
   * @param {*} _cookie The registration cookie.
   * @returns {void}
   */
  OnTick(_realTime, _simTime, _cookie)
  {
    for (const it of this._textures)
    {
      it.texture.UpdateLodRequest(it.request, this);
      if (it.request.mipChange === 0)
      {
        it.request.frameNumber = 0;
      }
    }

    this._textures.sort((a, b) =>
    {
      if (a.request.mipChange < b.request.mipChange)
      {
        return -1;
      }
      if (a.request.mipChange === b.request.mipChange)
      {
        return a.request.frameNumber > b.request.frameNumber ? -1 : (a.request.frameNumber < b.request.frameNumber ? 1 : 0);
      }

      return 1;
    });

    let creates = 0;
    let loads = 0;
    for (const it of this._textures)
    {
      if (it.request.mipChange === 0)
      {
        continue;
      }
      if (it.request.mipChange >= 0 && !this.NeedToTrimGpuTexture())
      {
        break;
      }
      if (creates >= Tr2TextureLodManager.textureLodChanges && loads >= Tr2TextureLodManager.textureLoadRequests)
      {
        break;
      }
      if (it.request.cachedInRam)
      {
        if (creates < Tr2TextureLodManager.textureLodChanges)
        {
          ++creates;
          it.texture.ProcessLodRequest(it.request, this);
          it.request.frameNumber = 0;
        }
      }
      else
      {
        if (loads < Tr2TextureLodManager.textureLoadRequests)
        {
          ++loads;
          it.texture.ProcessLodRequest(it.request, this);
          it.request.frameNumber = 0;
        }
      }
    }
  }

  /**
   * Carbon: Tr2TextureLodManager::CanUploadToGpu (Tr2TextureLodManager.cpp:139-142).
   * Always true; the description is not consulted.
   *
   * @param {object} _desc A Tr2BitmapDimensions.
   * @returns {boolean} True.
   */
  CanUploadToGpu(_desc)
  {
    return true;
  }

  /**
   * Carbon: Tr2TextureLodManager::NeedToTrimGpuTexture (Tr2TextureLodManager.cpp:144-147).
   *
   * @returns {boolean} Whether the tracked GPU texture memory is over the textureLodGpuBudget.
   */
  NeedToTrimGpuTexture()
  {
    return this.gpuMemorySize > Tr2TextureLodManager.textureLodGpuBudget;
  }

  /**
   * Carbon: Tr2TextureLodManager::NeedToTrimCpuTexture (Tr2TextureLodManager.cpp:149-152).
   *
   * @returns {boolean} Whether the tracked CPU texture memory is over the textureLodCpuBudget.
   */
  NeedToTrimCpuTexture()
  {
    return this.cpuMemorySize > Tr2TextureLodManager.textureLodCpuBudget;
  }

  /**
   * Carbon: Tr2TextureLodManager::GpuTextureCreated (Tr2TextureLodManager.cpp:154-160).
   * Adds the texture's size to the tracked GPU memory.
   *
   * Adapted: the Trinity/TextureLod/GpuSize and UploadSize statistics (CCP_STATS_SET / ADD)
   * are not ported; statistics have no JavaScript home yet.
   *
   * @param {object} desc A Tr2BitmapDimensions.
   * @returns {void}
   */
  GpuTextureCreated(desc)
  {
    const size = GetTextureSize(desc);
    this.gpuMemorySize = (this.gpuMemorySize + size) >>> 0;
  }

  /**
   * Carbon: Tr2TextureLodManager::GpuTextureDestroyed (Tr2TextureLodManager.cpp:162-166).
   * Takes the texture's size off the tracked GPU memory, wrapping at 32 bits as Carbon's
   * unsigned addition of the negated size does.
   *
   * Adapted: the Trinity/TextureLod/GpuSize statistic is not ported.
   *
   * @param {object} desc A Tr2BitmapDimensions.
   * @returns {void}
   */
  GpuTextureDestroyed(desc)
  {
    this.gpuMemorySize = (this.gpuMemorySize + ((-(GetTextureSize(desc) | 0)) >>> 0)) >>> 0;
  }

  /**
   * Carbon: Tr2TextureLodManager::CpuTextureCreated (Tr2TextureLodManager.cpp:168-172).
   * Adds the texture's size to the tracked CPU memory.
   *
   * Adapted: the Trinity/TextureLod/CpuSize statistic is not ported.
   *
   * @param {object} desc A Tr2BitmapDimensions.
   * @returns {void}
   */
  CpuTextureCreated(desc)
  {
    this.cpuMemorySize = (this.cpuMemorySize + GetTextureSize(desc)) >>> 0;
  }

  /**
   * Carbon: Tr2TextureLodManager::CpuTextureDestroyed (Tr2TextureLodManager.cpp:174-178).
   * Takes the texture's size off the tracked CPU memory, wrapping at 32 bits.
   *
   * Adapted: the Trinity/TextureLod/CpuSize statistic is not ported.
   *
   * @param {object} desc A Tr2BitmapDimensions.
   * @returns {void}
   */
  CpuTextureDestroyed(desc)
  {
    this.cpuMemorySize = (this.cpuMemorySize + ((-(GetTextureSize(desc) | 0)) >>> 0)) >>> 0;
  }

  /**
   * Carbon: Tr2TextureLodManager::GetStats (Tr2TextureLodManager.cpp:181-184).
   * A copy of the current Stats record.
   *
   * Quirk, reproduced: nothing in Carbon ever writes m_currentStats, so every field is zero
   * for the life of the process (the memory totals live in m_gpuMemorySize / m_cpuMemorySize).
   *
   * @returns {{gpuMemoryUsed: number, gpuMemoryAllocated: number, cpuMemoryUsed: number, cpuMemoryAllocated: number, gpuUploadSize: number}} The stats, by value.
   */
  GetStats()
  {
    return { ...this.currentStats };
  }

  /**
   * Carbon: Tr2TextureLodManager::SetUseLowResVtaFilesSetting (Tr2TextureLodManager.cpp:197-212).
   * On a change, reloads every managed texture whose path ends in ".vta" (longer than four
   * characters).
   *
   * @param {boolean} setting Whether to use the _lowdetail VTA file versions.
   * @returns {void}
   */
  SetUseLowResVtaFilesSetting(setting)
  {
    if (setting !== this.lowDetailVtaFiles)
    {
      this.lowDetailVtaFiles = setting;
      for (const t of this._textures)
      {
        const path = t.texture.GetPath();
        if (path.length > 4 && path.endsWith(".vta"))
        {
          t.texture.Reload();
        }
      }
    }
  }

  /**
   * Carbon: Tr2TextureLodManager::GetUseLowResVtaFilesSetting (Tr2TextureLodManager.cpp:214-217).
   *
   * @returns {boolean} Whether the _lowdetail VTA file versions are in use.
   */
  GetUseLowResVtaFilesSetting()
  {
    return this.lowDetailVtaFiles;
  }

  /** Blue MAP_PROPERTY "useLowResVtaFiles" (Tr2TextureLodManager_Blue.cpp). */
  @be.mapProperty()
  @meta.implemented
  get useLowResVtaFiles()
  {
    return this.GetUseLowResVtaFilesSetting();
  }

  /** Delegates the Blue "useLowResVtaFiles" setter. */
  @meta.implemented
  set useLowResVtaFiles(value)
  {
    this.SetUseLowResVtaFilesSetting(value);
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
    this._textures.push({ texture, request: new Tr2TextureLodUpdateRequest() });
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
    this._textures = this._textures.filter(entry => entry.texture !== texture);
    return this;
  }

  /**
   * Return a snapshot of registered texture resources.
   *
   * @returns {object[]} Registered textures in Carbon registration order.
   */
  GetManagedTextures()
  {
    return this._textures.map(entry => entry.texture);
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
CjsSchema.decorateMethod(Tr2TextureLodManager, "CanUploadToGpu", meta.implemented);
CjsSchema.decorateMethod(Tr2TextureLodManager, "NeedToTrimGpuTexture", meta.implemented);
CjsSchema.decorateMethod(Tr2TextureLodManager, "NeedToTrimCpuTexture", meta.implemented);
CjsSchema.decorateMethod(Tr2TextureLodManager, "GetStats", meta.implemented);
CjsSchema.decorateMethod(Tr2TextureLodManager, "SetUseLowResVtaFilesSetting", meta.implemented);
CjsSchema.decorateMethod(Tr2TextureLodManager, "GetUseLowResVtaFilesSetting", meta.implemented);
CjsSchema.decorateMethod(Tr2TextureLodManager, "GpuTextureCreated", meta.adapted);
CjsSchema.decorateMethod(Tr2TextureLodManager, "GpuTextureDestroyed", meta.adapted);
CjsSchema.decorateMethod(Tr2TextureLodManager, "CpuTextureCreated", meta.adapted);
CjsSchema.decorateMethod(Tr2TextureLodManager, "CpuTextureDestroyed", meta.adapted);
CjsSchema.decorateMethod(Tr2TextureLodManager, "OnTick", meta.notImplemented);
CjsSchema.decorateMethod(Tr2TextureLodManager, "Instance", meta.adapted);
CjsSchema.exposure.abstract(Tr2TextureLodManager);
be.define("Tr2TextureLodManager")(Tr2TextureLodManager);
