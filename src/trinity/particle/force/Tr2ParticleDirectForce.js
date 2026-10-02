// Source: trinity/trinity/Particle/Tr2ParticleDirectForce.h
// Source: trinity/trinity/Particle/Tr2ParticleDirectForce.cpp
// Source: trinity/trinity/Particle/Tr2ParticleDirectForce_Blue.cpp
import { vec3 } from "#math/vec3";
import { ITr2ParticleForce } from "./ITr2ParticleForce.js";
import { meta } from "#schema";


/** Constant particle force vector, applied identically to every particle. */
@meta.define({
  className: "Tr2ParticleDirectForce",
  family: "particle"
})
export class Tr2ParticleDirectForce extends ITr2ParticleForce
{
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  force = vec3.fromValues(1, 1, 1);

  /** Copies the authored constant force into caller-owned output. */
  @meta.blue.method
  @meta.adapted
  GetForce(_position, _velocity, _dt, _mass, out = vec3.create())
  {
    return vec3.copy(out, this.force);
  }

  /**
   * Nothing to advance per frame: the force vector is authored and never
   * changes.
   */
  @meta.blue.method
  @meta.noop
  Update(_dt)
  {
  }
}
