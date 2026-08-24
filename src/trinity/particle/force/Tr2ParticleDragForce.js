// Source: trinity/trinity/Particle/Tr2ParticleDragForce.h
// Source: trinity/trinity/Particle/Tr2ParticleDragForce.cpp
// Source: trinity/trinity/Particle/Tr2ParticleDragForce_Blue.cpp
import { vec3 } from "#math/vec3";
import { ITr2ParticleForce } from "./ITr2ParticleForce.js";
import { carbon, impl, io, type } from "#schema";


/** Linear particle drag: a force proportional to velocity and opposing it. */
@type.define({
  className: "Tr2ParticleDragForce",
  family: "particle"
})
export class Tr2ParticleDragForce extends ITr2ParticleForce
{
  @io.persist
  @type.float32
  drag = 0.1;

  /** Carbon's drag force is proportional and opposite to velocity. */
  @carbon.method
  @impl.adapted
  GetForce(_position, velocity, _dt, _mass, out = vec3.create())
  {
    return vec3.scale(out, velocity, -this.drag);
  }

  /**
   * Nothing to advance per frame: drag is computed from each particle's current
   * velocity.
   */
  @carbon.method
  @impl.noop
  Update(_dt)
  {
  }
}
