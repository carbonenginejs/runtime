// Source: trinity/trinity/Particle/Tr2StaticEmitter.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "#schema";
import { CjsModel } from "#model";
import { withITr2GenericEmitter } from "../ITr2GenericEmitter.js";

/** A one-shot particle emitter that spawns particles from a geometry resource's baked emission points on first update. */
@type.define({ className: "Tr2StaticEmitter", family: "particle" })
export class Tr2StaticEmitter extends withITr2GenericEmitter(CjsModel)
{

  #isThreadSafe = false;

  /** Carbon's internal one-shot spawn state. */
  @type.boolean
  hasSpawnedParticles = false;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_geometryResource (TriGrannyResPtr) [READ] */
  @io.read
  @type.objectRef("TriGrannyRes")
  geometryResource = null;

  /** m_meshIndex (uint32_t) [READWRITE, PERSIST] */
  @io.persist
  @type.uint32
  meshIndex = 0;

  /** m_particleSystem (Tr2ParticleSystemPtr) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.model("Tr2ParticleSystem")
  particleSystem = null;

  /** m_geometryResourcePath (std::string) [READWRITE, NOTIFY, PERSIST] */
  @io.notify
  @io.persist
  @type.string
  geometryResourcePath = "";

  /** Carbon method Spawn (MAP_METHOD_AND_WRAP). */
  @carbon.method
  /**
   * Resets the one-shot spawn flag so the emitter spawns again on the next update.
   */
  @impl.implemented
  Spawn()
  {
    this.hasSpawnedParticles = false;
  }

  /** Carbon method ForceSpawn -> DoSpawn (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  @impl.reason("Accepts decoded particle rows or a host geometry SpawnParticles adapter; native CMF/Granny vertex-buffer mapping remains resource-owned.")
  ForceSpawn()
  {
    if (!this.particleSystem?.isValid || !this.geometryResource)
    {
      return false;
    }
    if (typeof this.geometryResource.SpawnParticles === "function")
    {
      this.particleSystem.ClearParticles();
      const result = this.geometryResource.SpawnParticles(this.particleSystem, this.meshIndex);
      this.hasSpawnedParticles = result !== false;
      return result;
    }
    const source = this.geometryResource.GetPayload?.() ?? this.geometryResource;
    const meshes = source?.meshes ?? source?.Meshes ?? [];
    const mesh = meshes[this.meshIndex] ?? null;
    const particles = mesh?.particles ?? mesh?.Particles ?? source?.particles ?? source?.Particles;
    if (!Array.isArray(particles))
    {
      return false;
    }
    this.particleSystem.ClearParticles();
    let spawned = 0;
    for (const particle of particles)
    {
      if (this.particleSystem.SpawnParticle(particle) === null)
      {
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
  @impl.adapted
  @impl.reason("Resource streaming is host-owned in the browser; geometryResource arrives via the loader, so only the thread-safe propagation is mirrored.")
  Initialize()
  {
    if (this.particleSystem && this.#isThreadSafe)
    {
      this.particleSystem.SetThreadSafeFlag();
    }
    return true;
  }

  /**
   * INotify.OnModified (Tr2StaticEmitter.cpp:60-76): geometry path changes
   * restart the resource fetch (host-owned here); particle-system changes
   * re-propagate the thread-safe contract.
   */
  @impl.adapted
  @impl.reason("Geometry reloads are host-owned; only Carbon's particle-system thread-safe propagation applies on the CPU side.")
  OnModified(propertyName)
  {
    if ((!propertyName || propertyName === "particleSystem") && this.#isThreadSafe && this.particleSystem)
    {
      this.particleSystem.SetThreadSafeFlag();
    }
    return true;
  }

  /** ITr2GenericEmitter.SetThreadSafeFlag (Tr2StaticEmitter.cpp:83-90). */
  @impl.adapted
  /**
   * Marks the emitter thread-safe and propagates the flag to its particle system.
   */
  @impl.reason("JavaScript updates are single-threaded; the flag is retained and propagated only for Carbon contract parity.")
  SetThreadSafeFlag()
  {
    this.#isThreadSafe = true;
    if (this.particleSystem) this.particleSystem.SetThreadSafeFlag();
  }

  /**
   * Both Carbon SpawnParticles overloads are empty for the static emitter -
   * it only spawns once from Update (Tr2StaticEmitter.cpp:293-308).
   */
  @impl.noop
  /**
   * Does nothing: a static emitter spawns only during Update, never in response to a per-particle spawn call.
   */
  SpawnParticles(_a, _b, _c, _d, _e, _f)
  {
  }

  /** ITr2GenericEmitter.Update (Tr2StaticEmitter.cpp:274-280): one-shot spawn. */
  @impl.adapted
  Update(_updateArguments)
  {
    return this.hasSpawnedParticles ? false : this.ForceSpawn();
  }

}
