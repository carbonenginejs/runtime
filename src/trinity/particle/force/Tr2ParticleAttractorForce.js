// Source: trinity/trinity/Particle/Tr2ParticleAttractorForce.h
// Source: trinity/trinity/Particle/Tr2ParticleAttractorForce.cpp
// Source: trinity/trinity/Particle/Tr2ParticleAttractorForce_Blue.cpp
import { vec3 } from "#math/vec3";
import { ITr2ParticleForce } from "./ITr2ParticleForce.js";
import { meta, type, blue } from "#schema";


/**
 * Particle force of constant magnitude pointing at a fixed position, regardless
 * of distance.
 */
@blue.define("Tr2ParticleAttractorForce")
export class Tr2ParticleAttractorForce extends ITr2ParticleForce
{
  @blue.readwrite
  @blue.persist
  @type.vec3
  position = vec3.create();

  @blue.readwrite
  @blue.persist
  @type.float32
  magnitude = 1;

  /** Applies a constant-magnitude force toward the configured origin. */
  @blue.method
  @meta.adapted
  GetForce(position, _velocity, _dt, _mass, out = vec3.create())
  {
    vec3.subtract(out, this.position, position);
    const length = vec3.length(out);
    return length === 0 ? vec3.set(out, 0, 0, 0) : vec3.scale(out, out, this.magnitude / length);
  }

  /**
   * Nothing to advance per frame: the force depends only on the authored
   * position and magnitude.
   */
  @blue.method
  @meta.noop
  Update(_dt)
  {
  }
}
