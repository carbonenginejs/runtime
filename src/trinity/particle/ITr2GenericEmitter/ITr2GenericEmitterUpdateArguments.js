// Source: trinity/trinity/Particle/ITr2GenericEmitter.h
//   struct UpdateArguments, nested in the interface; flattened for JS.
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { meta, type, blue } from "#schema";


/** Per-frame values passed to an ITr2GenericEmitter update or spawn call. */
@blue.define({ className: "ITr2GenericEmitterUpdateArguments", donors: ["ITr2GenericEmitter::UpdateArguments"] })
export class ITr2GenericEmitterUpdateArguments
{
  @type.float64
  time = 0;

  @type.rootRef("Tr2GpuParticleSystem")
  system = null;

  @type.mat4
  parentTransform = mat4.create();

  @type.vec3
  originShift = vec3.create();

  @type.float32
  emitCountFactor = 1;
}
