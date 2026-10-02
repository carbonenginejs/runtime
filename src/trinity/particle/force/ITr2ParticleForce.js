// Source: trinity/trinity/Particle/ITr2ParticleForce.h
import { meta } from "#schema";


/** Required particle-force contract. */
@meta.define({ className: "ITr2ParticleForce", family: "particle" })
export class ITr2ParticleForce
{

  /** Updates force-owned state before particle integration. */
  @meta.blue.method
  @meta.abstract
  Update(_dt)
  {
    throw new Error("ITr2ParticleForce.Update must be implemented by a concrete force.");
  }

  /** Accumulates this force for one particle. */
  @meta.blue.method
  @meta.abstract
  GetForce(_position, _velocity, _dt, _mass, _out)
  {
    throw new Error("ITr2ParticleForce.GetForce must be implemented by a concrete force.");
  }

  /** Carbon's base debug hook is intentionally empty. */
  @meta.blue.method
  @meta.noop
  RenderDebugInfo()
  {
  }

}
