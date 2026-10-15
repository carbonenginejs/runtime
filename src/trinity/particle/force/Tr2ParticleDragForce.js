// Source: trinity/trinity/Particle/Tr2ParticleDragForce.h
// Source: trinity/trinity/Particle/Tr2ParticleDragForce.cpp
// Source: trinity/trinity/Particle/Tr2ParticleDragForce_Blue.cpp
import { vec3 } from "#math/vec3";
import { ITr2ParticleForce } from "./ITr2ParticleForce.js";
import { meta, type, blue } from "#schema";


/** Linear particle drag: a force proportional to velocity and opposing it. */
@blue.define("Tr2ParticleDragForce")
export class Tr2ParticleDragForce extends ITr2ParticleForce
{
  @blue.readwrite
  @blue.persist
  @type.float32
  drag = 0.1;

  /** Carbon's drag force is proportional and opposite to velocity. */
  @blue.method
  @meta.adapted
  GetForce(_position, velocity, _dt, _mass, out = vec3.create())
  {
    return vec3.scale(out, velocity, -this.drag);
  }

  /**
   * Nothing to advance per frame: drag is computed from each particle's current
   * velocity.
   */
  @blue.method
  @meta.noop
  Update(_dt)
  {
  }
}
