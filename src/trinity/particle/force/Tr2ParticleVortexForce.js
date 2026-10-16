// Source: trinity/trinity/Particle/Tr2ParticleVortexForce.h
// Source: trinity/trinity/Particle/Tr2ParticleVortexForce.cpp
// Source: trinity/trinity/Particle/Tr2ParticleVortexForce_Blue.cpp
import { vec3 } from "#math/vec3";
import { ITr2ParticleForce } from "./ITr2ParticleForce.js";
import { meta, type, blue } from "#schema";


/**
 * Particle force of constant magnitude directed tangentially around an axis
 * through a fixed position, swirling particles about it.
 */
@blue.interface(ITr2ParticleForce)
@blue.define("Tr2ParticleVortexForce")
export class Tr2ParticleVortexForce extends ITr2ParticleForce
{
  @blue.readwrite
  @blue.persist
  @type.float32
  magnitude = 1;

  @blue.readwrite
  @blue.persist
  @type.vec3
  axis = vec3.fromValues(0, 1, 0);

  @blue.readwrite
  @blue.persist
  @type.vec3
  position = vec3.create();

  /** Applies Carbon's normalized tangential vortex force. */
  @blue.method
  @meta.adapted
  GetForce(position, _velocity, _dt, _mass, out = vec3.create())
  {
    const f = Math.fround;
    let x = f(f(this.position[0]) - f(position[0]));
    let y = f(f(this.position[1]) - f(position[1]));
    let z = f(f(this.position[2]) - f(position[2]));
    const ax = f(this.axis[0]), ay = f(this.axis[1]), az = f(this.axis[2]);
    const cx = f(f(y * az) - f(z * ay));
    const cy = f(f(z * ax) - f(x * az));
    const cz = f(f(x * ay) - f(y * ax));
    x = cx; y = cy; z = cz;
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
   * Nothing to advance per frame: the vortex is fully described by its axis,
   * position and magnitude.
   */
  @blue.method
  @meta.noop
  Update(_dt)
  {
  }
}
