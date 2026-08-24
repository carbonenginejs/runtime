// Source: trinity/trinity/Particle/ITr2ParticleForce.h
import { CjsModel } from "#model";
import { carbon, impl, type } from "#schema";


/** Required particle-force contract. */
@type.define({ className: "ITr2ParticleForce", family: "particle" })
export class ITr2ParticleForce extends CjsModel
{

  /** Updates force-owned state before particle integration. */
  @carbon.method
  @impl.abstract
  Update(_dt)
  {
    throw new Error("ITr2ParticleForce.Update must be implemented by a concrete force.");
  }

  /** Accumulates this force for one particle. */
  @carbon.method
  @impl.abstract
  GetForce(_position, _velocity, _dt, _mass, _out)
  {
    throw new Error("ITr2ParticleForce.GetForce must be implemented by a concrete force.");
  }

  /** Carbon's base debug hook is intentionally empty. */
  @carbon.method
  @impl.noop
  RenderDebugInfo()
  {
  }

}
