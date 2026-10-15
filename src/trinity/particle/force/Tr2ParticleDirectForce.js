// Source: trinity/trinity/Particle/Tr2ParticleDirectForce.h
// Source: trinity/trinity/Particle/Tr2ParticleDirectForce.cpp
// Source: trinity/trinity/Particle/Tr2ParticleDirectForce_Blue.cpp
import { vec3 } from "#math/vec3";
import { ITr2ParticleForce } from "./ITr2ParticleForce.js";
import { meta, type, blue } from "#schema";


/** Constant particle force vector, applied identically to every particle. */
@blue.define("Tr2ParticleDirectForce")
export class Tr2ParticleDirectForce extends ITr2ParticleForce
{
  @blue.readwrite
  @blue.persist
  @type.vec3
  force = vec3.fromValues(1, 1, 1);

  /** Copies the authored constant force into caller-owned output. */
  @blue.method
  @meta.adapted
  GetForce(_position, _velocity, _dt, _mass, out = vec3.create())
  {
    return vec3.copy(out, this.force);
  }

  /**
   * Nothing to advance per frame: the force vector is authored and never
   * changes.
   */
  @blue.method
  @meta.noop
  Update(_dt)
  {
  }
}
