import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initProto, _initClass, _init_gpuMemoryUsed, _init_extra_gpuMemoryUsed, _init_gpuMemoryAllocated, _init_extra_gpuMemoryAllocated, _init_cpuMemoryUsed, _init_extra_cpuMemoryUsed, _init_cpuMemoryAllocated, _init_extra_cpuMemoryAllocated, _init_gpuUploadSize, _init_extra_gpuUploadSize, _init_gpuMemorySize, _init_extra_gpuMemorySize, _init_cpuMemorySize, _init_extra_cpuMemorySize, _init_currentStats, _init_extra_currentStats, _init_lowDetailVtaFiles, _init_extra_lowDetailVtaFiles;

/**
 * CPU-side registry for texture resources participating in LOD management.
 *
 * Carbon also accounts for device memory in this class. CarbonEngineJS keeps
 * device allocation and budget policy in engine packages, so this runtime
 * class owns only deterministic resource membership.
 */
let _Tr2TextureLodManager;
class Tr2TextureLodManager extends CjsModel {
  static {
    ({
      e: [_init_gpuMemoryUsed, _init_extra_gpuMemoryUsed, _init_gpuMemoryAllocated, _init_extra_gpuMemoryAllocated, _init_cpuMemoryUsed, _init_extra_cpuMemoryUsed, _init_cpuMemoryAllocated, _init_extra_cpuMemoryAllocated, _init_gpuUploadSize, _init_extra_gpuUploadSize, _init_gpuMemorySize, _init_extra_gpuMemorySize, _init_cpuMemorySize, _init_extra_cpuMemorySize, _init_currentStats, _init_extra_currentStats, _init_lowDetailVtaFiles, _init_extra_lowDetailVtaFiles, _initProto],
      c: [_Tr2TextureLodManager, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2TextureLodManager",
      family: "resources"
    })], [[[type, type.uint64], 16, "gpuMemoryUsed"], [[type, type.uint64], 16, "gpuMemoryAllocated"], [[type, type.uint64], 16, "cpuMemoryUsed"], [[type, type.uint64], 16, "cpuMemoryAllocated"], [[type, type.uint64], 16, "gpuUploadSize"], [[type, type.unknown], 16, "gpuMemorySize"], [[type, type.unknown], 16, "cpuMemorySize"], [type.rawStruct("Stats"), 0, "currentStats"], [[type, type.boolean], 16, "lowDetailVtaFiles"], [[carbon, carbon.method, impl, impl.implemented], 18, "RegisterTexture"], [[carbon, carbon.method, impl, impl.implemented], 18, "UnregisterTexture"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetManagedTextures"]], 0, void 0, CjsModel));
  }
  /** gpuMemoryUsed (size_t) */
  gpuMemoryUsed = (_initProto(this), _init_gpuMemoryUsed(this, 0));

  /** gpuMemoryAllocated (size_t) */
  gpuMemoryAllocated = (_init_extra_gpuMemoryUsed(this), _init_gpuMemoryAllocated(this, 0));

  /** cpuMemoryUsed (size_t) */
  cpuMemoryUsed = (_init_extra_gpuMemoryAllocated(this), _init_cpuMemoryUsed(this, 0));

  /** cpuMemoryAllocated (size_t) */
  cpuMemoryAllocated = (_init_extra_cpuMemoryUsed(this), _init_cpuMemoryAllocated(this, 0));

  /** gpuUploadSize (size_t) */
  gpuUploadSize = (_init_extra_cpuMemoryAllocated(this), _init_gpuUploadSize(this, 0));

  /** m_gpuMemorySize (CcpAtomic<uint32_t>) */
  gpuMemorySize = (_init_extra_gpuUploadSize(this), _init_gpuMemorySize(this, 0));

  /** m_cpuMemorySize (CcpAtomic<uint32_t>) */
  cpuMemorySize = (_init_extra_gpuMemorySize(this), _init_cpuMemorySize(this, 0));

  /** m_currentStats (Stats) */
  currentStats = (_init_extra_cpuMemorySize(this), _init_currentStats(this, null));

  /** m_lowDetailVtaFiles (bool) */
  lowDetailVtaFiles = (_init_extra_currentStats(this), _init_lowDetailVtaFiles(this, false));
  #textures = (_init_extra_lowDetailVtaFiles(this), []);

  /** Creates a Tr2TextureLodManager with caller-provided initial state. */
  constructor(values = null) {
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
  RegisterTexture(texture) {
    if (!texture || typeof texture !== "object" && typeof texture !== "function") {
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
  UnregisterTexture(texture) {
    this.#textures = this.#textures.filter(entry => entry !== texture);
    return this;
  }

  /**
   * Return a snapshot of registered texture resources.
   *
   * @returns {object[]} Registered textures in Carbon registration order.
   */
  GetManagedTextures() {
    return this.#textures.slice();
  }
  static {
    _initClass();
  }
}

export { _Tr2TextureLodManager as Tr2TextureLodManager };
//# sourceMappingURL=Tr2TextureLodManager.js.map
