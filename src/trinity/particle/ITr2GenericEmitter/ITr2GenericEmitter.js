// Source: trinity/trinity/Particle/ITr2GenericEmitter.h
import { CjsSchema, impl } from "#schema";


/** Contract shared by CPU and GPU particle emitters. */
export class ITr2GenericEmitter
{

  /** Updates emitter state for one frame. */
  Update(_arguments)
  {
    throw new Error("ITr2GenericEmitter.Update must be implemented by a particle emitter.");
  }

  /** Spawns particles using one of Carbon's two spawn call shapes. */
  SpawnParticles(..._args)
  {
    throw new Error("ITr2GenericEmitter.SpawnParticles must be implemented by a particle emitter.");
  }

  /** Notifies the emitter that spawn calls may arrive from concurrent simulation. */
  SetThreadSafeFlag()
  {
    throw new Error("ITr2GenericEmitter.SetThreadSafeFlag must be implemented by a particle emitter.");
  }
}

for (const method of ["Update", "SpawnParticles", "SetThreadSafeFlag"])
{
  CjsSchema.decorateMethod(ITr2GenericEmitter, method, impl.abstract);
}
CjsSchema.define(ITr2GenericEmitter, { className: "ITr2GenericEmitter" });
