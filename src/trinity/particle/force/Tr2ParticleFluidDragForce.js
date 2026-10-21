import { exposure as be } from "#be";
// Source: trinity/trinity/Particle/Tr2ParticleFluidDragForce.h
// Source: trinity/trinity/Particle/Tr2ParticleFluidDragForce.cpp
// Source: trinity/trinity/Particle/Tr2ParticleFluidDragForce_Blue.cpp
import { vec3 } from "#math/vec3";
import { ITr2ParticleForce } from "./ITr2ParticleForce.js";
import { meta, type, blue } from "#schema";


/**
 * Quadratic fluid drag on particles, clamped so a single integration step can
 * never push a particle's velocity past zero into a reversal.
 */
@be.mapInterface(ITr2ParticleForce)
@be.define("Tr2ParticleFluidDragForce")
export class Tr2ParticleFluidDragForce extends ITr2ParticleForce
{
  @blue.readwrite
  @blue.persist
  @type.float32
  drag = 1;

  /** Applies quadratic drag and Carbon's one-frame velocity reversal clamp. */
  @blue.method
  @meta.adapted
  GetForce(_position, velocity, dt, mass, out = vec3.create())
  {
    const f = Math.fround;
    const x = f(velocity[0]), y = f(velocity[1]), z = f(velocity[2]);
    const forceScale = f(vec3.lengthEstSse(velocity) * -f(this.drag));
    const step = f(f(dt) * f(mass));
    // Keep the native multiply, add and dot operations: collapsing this test
    // changes its result at float32 cancellation and overflow boundaries.
    const fx = f(x * forceScale), fy = f(y * forceScale), fz = f(z * forceScale);
    const nx = f(x + f(fx * step)), ny = f(y + f(fy * step)), nz = f(z + f(fz * step));
    const dot = f(f(f(nx * x) + f(ny * y)) + f(nz * z));
    if (dot < 0)
    {
      const maxScale = f(-1 / step);
      return vec3.set(out, f(x * maxScale), f(y * maxScale), f(z * maxScale));
    }
    return vec3.set(out, fx, fy, fz);
  }

  /**
   * Nothing to advance per frame: the drag term is derived from the particle's
   * current velocity and the step it is being integrated over.
   */
  @blue.method
  @meta.noop
  Update(_dt)
  {
  }
}
