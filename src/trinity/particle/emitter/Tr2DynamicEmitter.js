// Source: trinity/trinity/Particle/Tr2DynamicEmitter.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "#schema";
import { CjsModel } from "#model";
import { hasUnboundParticleElements } from "../element/particleElementBinding.js";

/** A continuous-rate particle emitter that binds attribute generators to a particle system and spawns particles over time from an accumulated emission rate. */
@type.define({ className: "Tr2DynamicEmitter", family: "particle" })
export class Tr2DynamicEmitter extends CjsModel
{

  #accumulatedRate = 0;

  #declarationHash = 0;

  #emittedParticles = 0;

  #isThreadSafe = false;

  #lastUpdate = 0;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_isValid (bool) [READ] */
  @io.read
  @type.boolean
  isValid = false;

  /** m_generators (PITr2AttributeGeneratorVector) [READ, PERSIST] */
  @io.persist
  @type.list("ITr2AttributeGenerator")
  generators = [];

  /** m_maxParticles (int32_t) [READWRITE, PERSIST] */
  @io.persist
  @type.int32
  maxParticles = -1;

  /** m_rate (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  rate = 0;

  /** m_particleSystem (Tr2ParticleSystemPtr) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.model("Tr2ParticleSystem")
  particleSystem = null;

  /** Carbon method Rebind (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  @impl.reason("Browser attribute generators bind directly to the CPU particle-system adapter rather than native declaration pointers.")
  Rebind()
  {
    this.#emittedParticles = 0;
    this.#accumulatedRate = 0;
    this.isValid = false;
    if (!this.particleSystem?.isValid)
    {
      return false;
    }
    const boundElements = new Set();
    for (const generator of this.generators)
    {
      if (typeof generator?.Bind !== "function")
      {
        throw new TypeError("Particle generators must implement Carbon's Bind contract.");
      }
      if (generator.Bind(this.particleSystem, boundElements) === false)
      {
        return false;
      }
    }
    if (hasUnboundParticleElements(this.particleSystem, boundElements))
    {
      return false;
    }
    this.#declarationHash = this.particleSystem.GetElementDeclarationHash();
    this.isValid = true;
    return true;
  }

  /** Carbon method UpdateSimulation (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  UpdateSimulation(dt)
  {
    return this.SpawnParticles(null, null, Math.max(0, Number(dt) || 0));
  }

  /**
   * ITr2GenericEmitter.Update (Tr2DynamicEmitter.cpp:109-123): clamp the frame
   * delta to 0.3s and spawn at the constant rate scaled by the LOD
   * emit-count factor.
   */
  @impl.adapted
  @impl.reason("Be::Time arrives as float seconds on the duck-typed update-arguments record instead of Carbon's native UpdateArguments struct.")
  Update(updateArguments)
  {
    if (!this.isValid || !this.particleSystem)
    {
      return;
    }
    const time = Number(updateArguments?.time) || 0;
    if (this.#lastUpdate === 0)
    {
      this.#lastUpdate = time;
    }
    const dt = Math.min(time - this.#lastUpdate, 0.3);
    this.#lastUpdate = time;
    const emitCountFactor = Number(updateArguments?.emitCountFactor ?? 1);
    this.UpdateSimulation(dt * emitCountFactor);
  }

  /**
   * Rebinds the attribute generators against the particle system, re-propagating the thread-safe flag when it was already set.
   */
  @impl.implemented
  Initialize()
  {
    if (this.particleSystem)
    {
      this.Rebind();
      if (this.#isThreadSafe)
      {
        this.particleSystem.SetThreadSafeFlag?.();
      }
    }
    return true;
  }

  /** INotify.OnModified (Tr2DynamicEmitter.cpp:63-74): rebind on particle-system changes. */
  @impl.implemented
  /**
   * Rebinds the attribute generators and re-propagates the thread-safe flag whenever the particle-system reference changes.
   */
  OnModified(propertyName)
  {
    if (!propertyName || propertyName === "particleSystem")
    {
      this.Rebind();
      if (this.#isThreadSafe && this.particleSystem)
      {
        this.particleSystem.SetThreadSafeFlag?.();
      }
    }
    return true;
  }

  /** ITr2GenericEmitter.SetThreadSafeFlag (Tr2DynamicEmitter.cpp:81-88). */
  @impl.adapted
  @impl.reason("JavaScript updates are single-threaded; the flag is retained and propagated only for Carbon contract parity.")
  SetThreadSafeFlag()
  {
    this.#isThreadSafe = true;
    this.particleSystem?.SetThreadSafeFlag?.();
  }

  /**
   * Both Carbon SpawnParticles overloads (Tr2DynamicEmitter.cpp:150-221)
   * collapse into one duck-typed entry point:
   * - (position, velocity, rateModifier) - the Tr2ParticleSystem CPU call shape;
   * - (updateArguments, position, velocity, rateModifier) - Carbon overload 1;
   * - (updateArguments, positionStart, positionEnd, velocityStart, velocityEnd,
   *   deltaTime) - Carbon overload 2, which forwards the end-of-frame values to
   *   overload 1 exactly as Tr2DynamicEmitter.cpp:213-221 does.
   * An update-arguments record is recognized as a leading non-array-like object.
   */
  @impl.adapted
  @impl.reason("JavaScript cannot overload; Carbon's signatures are distinguished by duck-typing the leading update-arguments record and the argument count.")
  SpawnParticles(a = null, b = null, c = undefined, d = undefined, e = undefined, f = undefined)
  {
    let position;
    let velocity;
    let rateModifier;
    if (a !== null && typeof a === "object" && typeof a.length !== "number")
    {
      // Carbon signature with the UpdateArguments record first.
      if (f !== undefined)
      {
        position = Tr2DynamicEmitter.#asVector(c);
        velocity = Tr2DynamicEmitter.#asVector(e);
        rateModifier = f;
      }
      else
      {
        position = Tr2DynamicEmitter.#asVector(b);
        velocity = Tr2DynamicEmitter.#asVector(c);
        rateModifier = d ?? 1;
      }
    }
    else
    {
      position = a ?? null;
      velocity = b ?? null;
      rateModifier = c ?? 1;
    }
    if (!this.isValid || !this.particleSystem)
    {
      return 0;
    }
    if ((this.particleSystem.GetElementDeclarationHash?.() ?? 0) !== this.#declarationHash)
    {
      this.isValid = false;
      return 0;
    }
    if (this.rate <= 0)
    {
      return 0;
    }
    this.#accumulatedRate += this.rate * Math.max(0, Number(rateModifier) || 0);
    let count = Math.floor(this.#accumulatedRate);
    this.#accumulatedRate -= count;
    // Carbon counts the whole batch against maxParticles before inserting
    // (Tr2DynamicEmitter.cpp:175-179), even when the system fills up mid-batch.
    if (this.maxParticles >= 0 && this.#emittedParticles + count > this.maxParticles)
    {
      count = Math.max(this.maxParticles - this.#emittedParticles, 0);
    }
    this.#emittedParticles += count;
    let spawned = 0;
    for (let index = 0; index < count; index++)
    {
      const particleIndex = this.particleSystem.BeginSpawnParticle?.();
      if (particleIndex === null || particleIndex === undefined)
      {
        break;
      }
      for (const generator of this.generators)
      {
        generator?.Generate?.(position, velocity, particleIndex);
      }
      this.particleSystem.EndSpawnParticle?.();
      spawned++;
    }
    return spawned;
  }

  /**
   * The running count of particles emitted since the last reset.
   */
  @impl.implemented
  GetEmittedParticleCount()
  {
    return this.#emittedParticles;
  }

  /**
   * Resets the running emitted-particle count to zero.
   */
  @impl.implemented
  ResetEmittedParticleCount()
  {
    this.#emittedParticles = 0;
  }

  /** Returns the value when it is an array-like vector, otherwise null. */
  static #asVector(value)
  {
    return value !== null && value !== undefined && typeof value.length === "number" ? value : null;
  }

}
