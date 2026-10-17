import { IRoot } from "../../../global/blue/IRoot.js";
// Source: trinity/trinity/Particle/ITr2ParticleForce.h
import { meta, blue } from "#schema";


/** Required particle-force contract. */
@blue.inherit(IRoot)
@blue.define("ITr2ParticleForce")
export class ITr2ParticleForce
{

  /** Updates force-owned state before particle integration. */
  @blue.abstract
  Update(_dt) {}

  /** Accumulates this force for one particle. */
  @blue.abstract
  GetForce(_position, _velocity, _dt, _mass, _out) {}

  /** Carbon's base debug hook is intentionally empty. */
  @blue.method
  @meta.noop
  RenderDebugInfo()
  {
  }

}
