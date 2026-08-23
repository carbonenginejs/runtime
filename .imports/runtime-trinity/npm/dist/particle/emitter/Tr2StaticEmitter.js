import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type, io, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initProto, _initClass, _init_hasSpawnedParticles, _init_extra_hasSpawnedParticles, _init_name, _init_extra_name, _init_geometryResource, _init_extra_geometryResource, _init_meshIndex, _init_extra_meshIndex, _init_particleSystem, _init_extra_particleSystem, _init_geometryResourcePath, _init_extra_geometryResourcePath;

/** A one-shot particle emitter that spawns particles from a geometry resource's baked emission points on first update. */
let _Tr2StaticEmitter;
class Tr2StaticEmitter extends CjsModel {
  static {
    ({
      e: [_init_hasSpawnedParticles, _init_extra_hasSpawnedParticles, _init_name, _init_extra_name, _init_geometryResource, _init_extra_geometryResource, _init_meshIndex, _init_extra_meshIndex, _init_particleSystem, _init_extra_particleSystem, _init_geometryResourcePath, _init_extra_geometryResourcePath, _initProto],
      c: [_Tr2StaticEmitter, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2StaticEmitter",
      family: "particle"
    })], [[[type, type.boolean], 16, "hasSpawnedParticles"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.read, void 0, type.objectRef("TriGrannyRes")], 16, "geometryResource"], [[io, io.persist, type, type.uint32], 16, "meshIndex"], [[io, io.notify, io, io.persist, void 0, type.model("Tr2ParticleSystem")], 16, "particleSystem"], [[io, io.notify, io, io.persist, type, type.string], 16, "geometryResourcePath"], [[carbon, carbon.method, impl, impl.implemented], 18, "Spawn"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Accepts decoded particle rows or a host geometry SpawnParticles adapter; native CMF/Granny vertex-buffer mapping remains resource-owned.")], 18, "ForceSpawn"], [[impl, impl.adapted, void 0, impl.reason("Resource streaming is host-owned in the browser; geometryResource arrives via the loader, so only the thread-safe propagation is mirrored.")], 18, "Initialize"], [[impl, impl.adapted, void 0, impl.reason("Geometry reloads are host-owned; only Carbon's particle-system thread-safe propagation applies on the CPU side.")], 18, "OnModified"], [[impl, impl.adapted, void 0, impl.reason("JavaScript updates are single-threaded; the flag is retained and propagated only for Carbon contract parity.")], 18, "SetThreadSafeFlag"], [[impl, impl.noop], 18, "SpawnParticles"], [[impl, impl.adapted], 18, "Update"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_geometryResourcePath(this);
  }
  #isThreadSafe = (_initProto(this), false);

  /** Carbon's internal one-shot spawn state. */
  hasSpawnedParticles = _init_hasSpawnedParticles(this, false);

  /** m_name (std::string) [READWRITE, PERSIST] */
  name = (_init_extra_hasSpawnedParticles(this), _init_name(this, ""));

  /** m_geometryResource (TriGrannyResPtr) [READ] */
  geometryResource = (_init_extra_name(this), _init_geometryResource(this, null));

  /** m_meshIndex (uint32_t) [READWRITE, PERSIST] */
  meshIndex = (_init_extra_geometryResource(this), _init_meshIndex(this, 0));

  /** m_particleSystem (Tr2ParticleSystemPtr) [READWRITE, PERSIST, NOTIFY] */
  particleSystem = (_init_extra_meshIndex(this), _init_particleSystem(this, null));

  /** m_geometryResourcePath (std::string) [READWRITE, NOTIFY, PERSIST] */
  geometryResourcePath = (_init_extra_particleSystem(this), _init_geometryResourcePath(this, ""));

  /** Carbon method Spawn (MAP_METHOD_AND_WRAP). */
  Spawn() {
    this.hasSpawnedParticles = false;
  }

  /** Carbon method ForceSpawn -> DoSpawn (MAP_METHOD_AND_WRAP). */
  ForceSpawn() {
    if (!this.particleSystem?.isValid || !this.geometryResource) {
      return false;
    }
    if (typeof this.geometryResource.SpawnParticles === "function") {
      this.particleSystem.ClearParticles();
      const result = this.geometryResource.SpawnParticles(this.particleSystem, this.meshIndex);
      this.hasSpawnedParticles = result !== false;
      return result;
    }
    const source = this.geometryResource.GetPayload?.() ?? this.geometryResource;
    const meshes = source?.meshes ?? source?.Meshes ?? [];
    const mesh = meshes[this.meshIndex] ?? null;
    const particles = mesh?.particles ?? mesh?.Particles ?? source?.particles ?? source?.Particles;
    if (!Array.isArray(particles)) {
      return false;
    }
    this.particleSystem.ClearParticles();
    let spawned = 0;
    for (const particle of particles) {
      if (this.particleSystem.SpawnParticle?.(particle) === null) {
        break;
      }
      spawned++;
    }
    this.hasSpawnedParticles = true;
    return spawned;
  }

  /**
   * IInitialize.Initialize (Tr2StaticEmitter.cpp:35-48): Carbon starts the
   * geometry resource fetch and propagates the thread-safe contract.
   */
  Initialize() {
    if (this.particleSystem && this.#isThreadSafe) {
      this.particleSystem.SetThreadSafeFlag?.();
    }
    return true;
  }

  /**
   * INotify.OnModified (Tr2StaticEmitter.cpp:60-76): geometry path changes
   * restart the resource fetch (host-owned here); particle-system changes
   * re-propagate the thread-safe contract.
   */
  OnModified(propertyName) {
    if ((!propertyName || propertyName === "particleSystem") && this.#isThreadSafe && this.particleSystem) {
      this.particleSystem.SetThreadSafeFlag?.();
    }
    return true;
  }

  /** ITr2GenericEmitter.SetThreadSafeFlag (Tr2StaticEmitter.cpp:83-90). */
  SetThreadSafeFlag() {
    this.#isThreadSafe = true;
    this.particleSystem?.SetThreadSafeFlag?.();
  }

  /**
   * Both Carbon SpawnParticles overloads are empty for the static emitter -
   * it only spawns once from Update (Tr2StaticEmitter.cpp:293-308).
   */
  /**
   * Does nothing: a static emitter spawns only during Update, never in response to a per-particle spawn call.
   */
  SpawnParticles(_a, _b, _c, _d, _e, _f) {}

  /** ITr2GenericEmitter.Update (Tr2StaticEmitter.cpp:274-280): one-shot spawn. */
  Update(_updateArguments) {
    return this.hasSpawnedParticles ? false : this.ForceSpawn();
  }
  static {
    _initClass();
  }
}

export { _Tr2StaticEmitter as Tr2StaticEmitter };
//# sourceMappingURL=Tr2StaticEmitter.js.map
