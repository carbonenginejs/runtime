// Source: trinity/trinity/Particle/ITr2GenericEmitter.h
import { CjsSchema, meta } from "#schema";


/** Contract shared by CPU and GPU particle emitters. */
export class ITr2GenericEmitter
{

  /** Updates emitter state for one frame. */
  Update(_arguments)
  {
    throw new Error("ITr2GenericEmitter.Update must be implemented by a particle emitter.");
  }

  /** Carbon's SpawnParticles( arguments, position, velocity, rateModifier ) (ITr2GenericEmitter.h:75). */
  SpawnParticles(_arguments, _position = null, _velocity = null, _rateModifier = 1)
  {
    throw new Error("ITr2GenericEmitter.SpawnParticles must be implemented by a particle emitter.");
  }

  /** Carbon's SpawnParticles( arguments, positionStart, positionEnd, velocityStart, velocityEnd, deltaTime ) (ITr2GenericEmitter.h:93). */
  SpawnParticles__StartEnd(_arguments, _positionStart, _positionEnd, _velocityStart, _velocityEnd, _deltaTime)
  {
    throw new Error("ITr2GenericEmitter.SpawnParticles__StartEnd must be implemented by a particle emitter.");
  }

  /** Notifies the emitter that spawn calls may arrive from concurrent simulation. */
  SetThreadSafeFlag()
  {
    throw new Error("ITr2GenericEmitter.SetThreadSafeFlag must be implemented by a particle emitter.");
  }
}

for (const method of ["Update", "SpawnParticles", "SetThreadSafeFlag"])
{
  CjsSchema.decorateMethod(ITr2GenericEmitter, method, meta.abstract);
}
CjsSchema.define(ITr2GenericEmitter, { className: "ITr2GenericEmitter" });
