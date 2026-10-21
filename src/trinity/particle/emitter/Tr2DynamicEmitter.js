import { exposure as be } from "#be";
// Source: trinity/trinity/Particle/Tr2DynamicEmitter.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta, type, blue } from "#schema";
import { IsMatch, IInitialize, INotify, CcpTime } from "#blue";
import { hasUnboundParticleElements } from "../element/particleElementBinding.js";
import { ITr2GenericEmitterUpdateArguments, ITr2GenericEmitter } from "../ITr2GenericEmitter/index.js";

/** A continuous-rate particle emitter that binds attribute generators to a particle system and spawns particles over time from an accumulated emission rate. */
@be.define("Tr2DynamicEmitter")
@blue.inherit(INotify, IInitialize)
@be.mapInterface(ITr2GenericEmitter)
@be.mapInterface(INotify)
@be.mapInterface(IInitialize)
export class Tr2DynamicEmitter extends ITr2GenericEmitter
{

  #accumulatedRate = 0;

  #declarationHash = 0;

  #emittedParticles = 0;

  #isThreadSafe = false;

  /** m_lastUpdate (Be::Time, Blue 100ns ticks). */
  #lastUpdate = 0;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  /** m_isValid (bool) [READ] */
  @blue.read
  @type.boolean
  isValid = false;

  /** m_generators (PITr2AttributeGeneratorVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("ITr2AttributeGenerator")
  generators = [];

  /** m_maxParticles (int32_t) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.int32
  maxParticles = -1;

  /** m_rate (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  rate = 0;

  /** m_particleSystem (Tr2ParticleSystemPtr) [READWRITE, PERSIST, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.rootRef("Tr2ParticleSystem")
  particleSystem = null;

  /**
   * Carbon MAP_PROPERTY_READONLY "emittedParticles" over
   * GetEmittedParticleCount (Tr2DynamicEmitter_Blue.cpp:22): the particles
   * emitted since the last reset.
   */
  @blue.property()
  @type.uint32
  @meta.implemented
  get emittedParticles()
  {
    return this.GetEmittedParticleCount();
  }

  /**
   * Carbon method Rebind (MAP_METHOD_AND_WRAP).
   *
   * Adapted: Browser attribute generators bind directly to the CPU particle-system adapter
   * rather than native declaration pointers.
   */
  @blue.method
  @meta.adapted
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
  @blue.method
  @meta.adapted
  UpdateSimulation(dt)
  {
    return this.SpawnParticles(new ITr2GenericEmitterUpdateArguments(), null, null, Math.max(0, Number(dt) || 0));
  }

  /**
   * ITr2GenericEmitter.Update (Tr2DynamicEmitter.cpp:109-123): clamp the frame
   * delta (TimeAsFloat of the Be::Time tick difference) to 0.3s and spawn at the
   * constant rate scaled by the LOD emit-count factor.
   */
  @blue.method
  @meta.implemented
  Update(updateArguments)
  {
    if (!this.isValid || !this.particleSystem)
    {
      return;
    }
    if (this.#lastUpdate === 0)
    {
      this.#lastUpdate = updateArguments.time;
    }
    const dt = Math.min(CcpTime.timeAsFloat(updateArguments.time - this.#lastUpdate), Math.fround(0.3));
    this.#lastUpdate = updateArguments.time;

    this.UpdateSimulation(dt * updateArguments.emitCountFactor);
  }

  /**
   * Rebinds the attribute generators against the particle system, re-propagating the thread-safe flag when it was already set.
   */
  @blue.method
  @meta.implemented
  Initialize()
  {
    if (this.particleSystem)
    {
      this.Rebind();
      if (this.#isThreadSafe)
      {
        this.particleSystem.SetThreadSafeFlag();
      }
    }
    return true;
  }

  /** INotify.OnModified (Tr2DynamicEmitter.cpp:63-74): rebind on particle-system changes. */
  /**
   * Rebinds the attribute generators and re-propagates the thread-safe flag whenever the particle-system reference changes.
   */
  @blue.method
  @meta.implemented
  OnModified(propertyName)
  {
    if (IsMatch(propertyName, "particleSystem"))
    {
      this.Rebind();
      if (this.#isThreadSafe && this.particleSystem)
      {
        this.particleSystem.SetThreadSafeFlag();
      }
    }
    return true;
  }

  /**
   * ITr2GenericEmitter.SetThreadSafeFlag (Tr2DynamicEmitter.cpp:81-88).
   *
   * Adapted: JavaScript updates are single-threaded; the flag is retained and propagated
   * only for Carbon contract parity.
   */
  @blue.method
  @meta.adapted
  SetThreadSafeFlag()
  {
    this.#isThreadSafe = true;
    if (this.particleSystem) this.particleSystem.SetThreadSafeFlag();
  }

  /**
   * Carbon's SpawnParticles( arguments, position, velocity, rateModifier )
   * (Tr2DynamicEmitter.cpp:150).
   * @param {ITr2GenericEmitterUpdateArguments} arguments_
   * @param {vec3|null} [position]
   * @param {vec3|null} [velocity]
   * @param {number} [rateModifier]
   * @returns {number} Particles spawned.
   */
  @blue.method
  @meta.implemented
  SpawnParticles(arguments_, position = null, velocity = null, rateModifier = 1)
  {
    if (!this.isValid || !this.particleSystem)
    {
      return 0;
    }
    if (this.particleSystem.GetElementDeclarationHash() !== this.#declarationHash)
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
      const particleIndex = this.particleSystem.BeginSpawnParticle();
      if (particleIndex === null || particleIndex === undefined)
      {
        break;
      }
      for (const generator of this.generators)
      {
        generator.Generate(position, velocity, particleIndex);
      }
      this.particleSystem.EndSpawnParticle();
      spawned++;
    }
    return spawned;
  }

  /**
   * Carbon's SpawnParticles( arguments, positionStart, positionEnd,
   * velocityStart, velocityEnd, deltaTime ) (Tr2DynamicEmitter.cpp:213-221):
   * forwards the end-of-frame values, passing deltaTime as the rate modifier as
   * Carbon does.
   */
  @blue.method
  @meta.implemented
  SpawnParticles__StartEnd(arguments_, _positionStart, positionEnd, _velocityStart, velocityEnd, deltaTime)
  {
    return this.SpawnParticles(arguments_, positionEnd, velocityEnd, deltaTime);
  }

  /**
   * Carbon IsValid (Tr2DynamicEmitter.cpp:97-100): whether the emitter bound
   * to its particle system on the last Rebind.
   * @returns {boolean}
   */
  @blue.method
  @meta.implemented
  IsValid()
  {
    return this.isValid;
  }

  /**
   * The running count of particles emitted since the last reset.
   */
  @blue.method
  @meta.implemented
  GetEmittedParticleCount()
  {
    return this.#emittedParticles;
  }

  /**
   * Resets the running emitted-particle count to zero.
   */
  @blue.method
  @meta.implemented
  ResetEmittedParticleCount()
  {
    this.#emittedParticles = 0;
  }

}

// Tr2DynamicEmitter_Blue.cpp maps these identities without a base chain.
