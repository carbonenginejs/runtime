// Source: trinity/trinity/Particle/Tr2DynamicEmitter.h
import { exposure as be } from "#be";
// Hand-maintained from Carbon source, promoted out of generated intake.
import { type } from "#schema";
import { IsMatch, IInitialize, INotify, CcpTime, BlueList } from "#blue";
import { hasUnboundParticleElements } from "../element/particleElementBinding.js";
import { ITr2GenericEmitterUpdateArguments, ITr2GenericEmitter } from "../ITr2GenericEmitter/index.js";
import { ITr2AttributeGenerator } from "../attribute/ITr2AttributeGenerator.js";

/** A continuous-rate particle emitter that binds attribute generators to a particle system and spawns particles over time from an accumulated emission rate. */
@be.define({
  name: "Tr2DynamicEmitter",
  inherit: [ INotify, IInitialize ],
  // Tr2DynamicEmitter_Blue.cpp:10-25, in Carbon's order.
  interfaces: [ ITr2GenericEmitter, INotify, IInitialize ],
  members: [
    [ be.ATTR, "name", be.READWRITE | be.PERSIST ],
    [ be.ATTR, "generators", be.READ | be.PERSIST ],
    [ be.ATTR, "isValid", be.READ ],
    [ be.ATTR, "particleSystem", be.READWRITE | be.PERSIST | be.NOTIFY ],
    [ be.ATTR, "rate", be.READWRITE | be.PERSIST ],
    [ be.ATTR, "maxParticles", be.READWRITE | be.PERSIST ],
    [ be.PROP_RO, "emittedParticles" ],
    [ be.METHOD, "Rebind", be.WRAP ],
    [ be.METHOD, "UpdateSimulation", be.WRAP ]
  ]
})
export class Tr2DynamicEmitter extends ITr2GenericEmitter
{

  _accumulatedRate = 0;

  _declarationHash = 0;

  _emittedParticles = 0;

  _isThreadSafe = false;

  /** m_lastUpdate (Be::Time, Blue 100ns ticks). */
  _lastUpdate = 0;

  /** m_name (std::string) [READWRITE, PERSIST] */

  @type.string
  name = "";

  /** m_isValid (bool) [READ] */
  @type.boolean
  isValid = false;

  /** m_generators (PITr2AttributeGeneratorVector) [READ, PERSIST] */

  @type.list("ITr2AttributeGenerator")
  generators = new BlueList(ITr2AttributeGenerator);

  /** m_maxParticles (int32_t) [READWRITE, PERSIST] */

  @type.int32
  maxParticles = -1;

  /** m_rate (float) [READWRITE, PERSIST] */

  @type.float32
  rate = 0;

  /** m_particleSystem (Tr2ParticleSystemPtr) [READWRITE, PERSIST, NOTIFY] */


  @type.object.ref("Tr2ParticleSystem")
  particleSystem = null;

  /**
   * Carbon MAP_PROPERTY_READONLY "emittedParticles" over
   * GetEmittedParticleCount (Tr2DynamicEmitter_Blue.cpp:22): the particles
   * emitted since the last reset.
   *
   * @implemented
   */
  @type.uint32
  get emittedParticles()
  {
    return this.GetEmittedParticleCount();
  }

  /**
   * Carbon method Rebind (MAP_METHOD_AND_WRAP).
   *
   * @adapted Browser attribute generators bind directly to the CPU particle-system adapter
   *   rather than native declaration pointers.
   */
  Rebind()
  {
    this._emittedParticles = 0;
    this._accumulatedRate = 0;
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
    this._declarationHash = this.particleSystem.GetElementDeclarationHash();
    this.isValid = true;
    return true;
  }

  /**
   * Carbon method UpdateSimulation (MAP_METHOD_AND_WRAP).
   *
   * @adapted
   */
  UpdateSimulation(dt)
  {
    return this.SpawnParticles(new ITr2GenericEmitterUpdateArguments(), null, null, Math.max(0, Number(dt) || 0));
  }

  /**
   * ITr2GenericEmitter.Update (Tr2DynamicEmitter.cpp:109-123): clamp the frame
   * delta (TimeAsFloat of the Be::Time tick difference) to 0.3s and spawn at the
   * constant rate scaled by the LOD emit-count factor.
   *
   * @implemented
   */

  Update(updateArguments)
  {
    if (!this.isValid || !this.particleSystem)
    {
      return;
    }
    if (this._lastUpdate === 0)
    {
      this._lastUpdate = updateArguments.time;
    }
    const dt = Math.min(CcpTime.timeAsFloat(updateArguments.time - this._lastUpdate), Math.fround(0.3));
    this._lastUpdate = updateArguments.time;

    this.UpdateSimulation(dt * updateArguments.emitCountFactor);
  }

  /**
   * Rebinds the attribute generators against the particle system, re-propagating the thread-safe flag when it was already set.
   *
   * @implemented
   */

  Initialize()
  {
    if (this.particleSystem)
    {
      this.Rebind();
      if (this._isThreadSafe)
      {
        this.particleSystem.SetThreadSafeFlag();
      }
    }
    return true;
  }

  /** INotify.OnModified (Tr2DynamicEmitter.cpp:63-74): rebind on particle-system changes. */
  /**
   * Rebinds the attribute generators and re-propagates the thread-safe flag whenever the particle-system reference changes.
   *
   * @implemented
   */

  OnModified(propertyName)
  {
    if (IsMatch(propertyName, "particleSystem"))
    {
      this.Rebind();
      if (this._isThreadSafe && this.particleSystem)
      {
        this.particleSystem.SetThreadSafeFlag();
      }
    }
    return true;
  }

  /**
   * ITr2GenericEmitter.SetThreadSafeFlag (Tr2DynamicEmitter.cpp:81-88).
   *
   * @adapted JavaScript updates are single-threaded; the flag is retained and propagated
   *   only for Carbon contract parity.
   */

  SetThreadSafeFlag()
  {
    this._isThreadSafe = true;
    if (this.particleSystem) this.particleSystem.SetThreadSafeFlag();
  }

  /**
   * Carbon's SpawnParticles( arguments, position, velocity, rateModifier )
   * (Tr2DynamicEmitter.cpp:150).
   *
   * @implemented
   * @param {ITr2GenericEmitterUpdateArguments} arguments_
   * @param {vec3|null} [position]
   * @param {vec3|null} [velocity]
   * @param {number} [rateModifier]
   * @returns {number} Particles spawned.
   */

  SpawnParticles(arguments_, position = null, velocity = null, rateModifier = 1)
  {
    if (!this.isValid || !this.particleSystem)
    {
      return 0;
    }
    if (this.particleSystem.GetElementDeclarationHash() !== this._declarationHash)
    {
      this.isValid = false;
      return 0;
    }
    if (this.rate <= 0)
    {
      return 0;
    }
    this._accumulatedRate += this.rate * Math.max(0, Number(rateModifier) || 0);
    let count = Math.floor(this._accumulatedRate);
    this._accumulatedRate -= count;
    // Carbon counts the whole batch against maxParticles before inserting
    // (Tr2DynamicEmitter.cpp:175-179), even when the system fills up mid-batch.
    if (this.maxParticles >= 0 && this._emittedParticles + count > this.maxParticles)
    {
      count = Math.max(this.maxParticles - this._emittedParticles, 0);
    }
    this._emittedParticles += count;
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
   *
   * @implemented
   */

  SpawnParticles__StartEnd(arguments_, _positionStart, positionEnd, _velocityStart, velocityEnd, deltaTime)
  {
    return this.SpawnParticles(arguments_, positionEnd, velocityEnd, deltaTime);
  }

  /**
   * Carbon IsValid (Tr2DynamicEmitter.cpp:97-100): whether the emitter bound
   * to its particle system on the last Rebind.
   *
   * @implemented
   * @returns {boolean}
   */

  IsValid()
  {
    return this.isValid;
  }

  /**
   * The running count of particles emitted since the last reset.
   *
   * @implemented
   */

  GetEmittedParticleCount()
  {
    return this._emittedParticles;
  }

  /**
   * Resets the running emitted-particle count to zero.
   *
   * @implemented
   */

  ResetEmittedParticleCount()
  {
    this._emittedParticles = 0;
  }

}

// Tr2DynamicEmitter_Blue.cpp maps these identities without a base chain.
