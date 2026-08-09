// Source: E:\carbonengine\trinity\trinity\Particle\Tr2GpuUniqueEmitter.h
// Source: E:\carbonengine\trinity\trinity\Particle\Tr2GpuUniqueEmitter.cpp
// Source: E:\carbonengine\trinity\trinity\Particle\Tr2GpuUniqueEmitter_Blue.cpp
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { Tr2GpuSharedEmitter } from "./Tr2GpuSharedEmitter.js";


/**
 * GPU emitter owned by a single instance, adding parent scaling and a
 * per-instance attractor on top of the shared emitter parameters.
 */
@type.define({ className: "Tr2GpuUniqueEmitter", family: "particle" })
export class Tr2GpuUniqueEmitter extends Tr2GpuSharedEmitter
{
  @io.persist
  @type.boolean
  scaledByParent = false;

  @io.notify
  @io.persist
  @type.vec3
  attractorPosition = vec3.create();

  @io.notify
  @io.persist
  @type.float32
  attractorStrength = 0;
}
