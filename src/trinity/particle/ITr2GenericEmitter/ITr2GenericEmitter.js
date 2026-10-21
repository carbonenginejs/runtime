import { IRoot } from "../../../global/blue/IRoot.js";
// Source: trinity/trinity/Particle/ITr2GenericEmitter.h
import { CjsSchema, blue } from "#schema";
import { ITr2GenericEmitterUpdateArguments } from "./ITr2GenericEmitterUpdateArguments.js";


/** Contract shared by CPU and GPU particle emitters. */
@blue.inherit(IRoot)
export class ITr2GenericEmitter
{

  /** Carbon's pure virtual `Update( const UpdateArguments& arguments )` (ITr2GenericEmitter.h:59): updates emitter state for one frame. */
  @blue.abstract
  Update(_arguments) {}

  /** Carbon's pure virtual SpawnParticles( arguments, position, velocity, rateModifier ) (ITr2GenericEmitter.h:75). */
  @blue.abstract
  SpawnParticles(_arguments, _position = null, _velocity = null, _rateModifier = 1) {}

  /** Carbon's pure virtual SpawnParticles( arguments, positionStart, positionEnd, velocityStart, velocityEnd, deltaTime ) (ITr2GenericEmitter.h:93). */
  @blue.abstract
  SpawnParticles__StartEnd(_arguments, _positionStart, _positionEnd, _velocityStart, _velocityEnd, _deltaTime) {}

  /** Carbon's pure virtual `SetThreadSafeFlag()` (ITr2GenericEmitter.h:105): spawn calls may arrive from concurrent simulation. */
  @blue.abstract
  SetThreadSafeFlag() {}

  /** Carbon ITr2GenericEmitter::UpdateArguments (public, ITr2GenericEmitter.h:21-51). */
  static UpdateArguments = ITr2GenericEmitterUpdateArguments;
}

CjsSchema.exposure.interface("ITr2GenericEmitter")(ITr2GenericEmitter);
