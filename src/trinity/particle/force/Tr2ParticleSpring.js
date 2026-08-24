// Source: trinity/trinity/Particle/Tr2ParticleSpring.h
// Source: trinity/trinity/Particle/Tr2ParticleSpring.cpp
// Source: trinity/trinity/Particle/Tr2ParticleSpring_Blue.cpp
import { vec3 } from "#math/vec3";
import { ITr2ParticleForce } from "./ITr2ParticleForce.js";
import { carbon, impl, io, type } from "#schema";


/**
 * Linear spring pulling particles toward a fixed position with a force
 * proportional to displacement.
 */
@type.define({
  className: "Tr2ParticleSpring",
  family: "particle"
})
export class Tr2ParticleSpring extends ITr2ParticleForce
{
  @io.persist
  @type.vec3
  position = vec3.create();

  @io.persist
  @type.float32
  springConstant = 0;

  /** Applies Carbon's linear spring force toward the configured origin. */
  @carbon.method
  @impl.adapted
  GetForce(position, _velocity, _dt, _mass, out = vec3.create())
  {
    vec3.subtract(out, position, this.position);
    return vec3.scale(out, out, -this.springConstant);
  }

  /**
   * Nothing to advance per frame: the spring force depends only on each
   * particle's current position.
   */
  @carbon.method
  @impl.noop
  Update(_dt)
  {
  }
}
