// Source: trinity/trinity/Particle/ITr2GenericEmitter.h
//   struct UpdateArguments, nested in the interface; flattened for JS.
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { meta } from "#schema";


/** Per-frame values passed to an ITr2GenericEmitter update or spawn call. */
@meta.define({ className: "ITr2GenericEmitterUpdateArguments", family: "particle" })
export class ITr2GenericEmitterUpdateArguments
{
  @meta.type.float64
  time = 0;

  @meta.type.objectRef("Tr2GpuParticleSystem")
  system = null;

  @meta.type.mat4
  parentTransform = mat4.create();

  @meta.type.vec3
  originShift = vec3.create();

  @meta.type.float32
  emitCountFactor = 1;
}
