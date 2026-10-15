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
    vec3.subtract(out, this.position, position);
    vec3.cross(out, out, this.axis);
    const length = vec3.length(out);
    return length === 0 ? vec3.set(out, 0, 0, 0) : vec3.scale(out, out, this.magnitude / length);
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
