// Source: trinity/trinity/Particle/ITr2GenericEmitter.h
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { CjsModel } from "#model";
import { CjsSchema, impl, type } from "#schema";


const ITR2_GENERIC_EMITTER = Symbol.for("carbonenginejs.contract.ITr2GenericEmitter");


/** Per-frame values passed to an ITr2GenericEmitter update or spawn call. */
@type.define({ className: "ITr2GenericEmitterUpdateArguments", family: "particle" })
export class ITr2GenericEmitterUpdateArguments extends CjsModel
{
  @type.float64
  time = 0;

  @type.objectRef("Tr2GpuParticleSystem")
  system = null;

  @type.mat4
  parentTransform = mat4.create();

  @type.vec3
  originShift = vec3.create();

  @type.float32
  emitCountFactor = 1;
}


/** Contract shared by CPU and GPU particle emitters. */
export class ITr2GenericEmitter
{
  static [Symbol.hasInstance](value)
  {
    return value !== null && value !== undefined && value[ITR2_GENERIC_EMITTER] === true;
  }

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

Object.defineProperty(ITr2GenericEmitter.prototype, ITR2_GENERIC_EMITTER, { value: true });
for (const method of ["Update", "SpawnParticles", "SetThreadSafeFlag"])
{
  CjsSchema.decorateMethod(ITr2GenericEmitter, method, impl.abstract);
}
CjsSchema.define(ITr2GenericEmitter, { className: "ITr2GenericEmitter" });


/** Adds the ITr2GenericEmitter contract without replacing an existing base. */
export function withITr2GenericEmitter(Base)
{
  const Emitter = class extends Base
  {
    Update(argumentsValue)
    {
      return ITr2GenericEmitter.prototype.Update.call(this, argumentsValue);
    }

    SpawnParticles(...args)
    {
      return ITr2GenericEmitter.prototype.SpawnParticles.call(this, ...args);
    }

    SetThreadSafeFlag()
    {
      return ITr2GenericEmitter.prototype.SetThreadSafeFlag.call(this);
    }
  };

  Object.defineProperty(Emitter.prototype, ITR2_GENERIC_EMITTER, { value: true });
  for (const method of ["Update", "SpawnParticles", "SetThreadSafeFlag"])
  {
    CjsSchema.decorateMethod(Emitter, method, impl.abstract);
  }
  return Emitter;
}
