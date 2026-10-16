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
@blue.interface(ITr2ParticleForce)
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
    const f = Math.fround;
    let x = f(f(this.position[0]) - f(position[0]));
    let y = f(f(this.position[1]) - f(position[1]));
    let z = f(f(this.position[2]) - f(position[2]));
    vec3.set(out, x, y, z);
    const reciprocal = vec3.reciprocalLengthEstSse(out);
    const magnitude = f(this.magnitude);
    // Carbon selects zero only for a +infinity reciprocal, then scales.
    // Keep normalization and magnitude as separate float32 multiplies.
    return reciprocal === Infinity
      ? vec3.set(out, f(0 * magnitude), f(0 * magnitude), f(0 * magnitude))
      : vec3.set(out, f(f(x * reciprocal) * magnitude), f(f(y * reciprocal) * magnitude), f(f(z * reciprocal) * magnitude));
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
