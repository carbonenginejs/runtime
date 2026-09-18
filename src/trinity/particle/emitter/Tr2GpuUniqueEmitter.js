// Source: trinity/trinity/Particle/Tr2GpuUniqueEmitter.h
// Source: trinity/trinity/Particle/Tr2GpuUniqueEmitter.cpp
// Source: trinity/trinity/Particle/Tr2GpuUniqueEmitter_Blue.cpp
import { vec3 } from "#math/vec3";
import { edit, type } from "#schema";
import { Tr2GpuSharedEmitter } from "./Tr2GpuSharedEmitter.js";


/**
 * GPU emitter owned by a single instance, adding parent scaling and a
 * per-instance attractor on top of the shared emitter parameters.
 */
@type.define({ className: "Tr2GpuUniqueEmitter", family: "particle" })
export class Tr2GpuUniqueEmitter extends Tr2GpuSharedEmitter
{
  @edit.persist
  @type.boolean
  scaledByParent = false;

  @edit.notify
  @edit.persist
  @type.vec3
  attractorPosition = vec3.create();

  @edit.notify
  @edit.persist
  @type.float32
  attractorStrength = 0;
}
