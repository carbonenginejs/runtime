// Source: trinity/trinity/Particle/ITr2GenericParticleConstraint.h
import { meta } from "#schema";


/** Required particle-constraint contract. */
@meta.define({ className: "ITr2GenericParticleConstraint", family: "particle" })
export class ITr2GenericParticleConstraint
{

  /** Binds the constraint to the particle-system declaration. */
  @meta.blue.method
  @meta.abstract
  Bind(_particleSystem)
  {
    throw new Error("ITr2GenericParticleConstraint.Bind must be implemented by a concrete constraint.");
  }

  /** Applies the constraint to one particle-system update. */
  @meta.blue.method
  @meta.abstract
  ApplyConstraint(_buffers, _strides, _count, _dt)
  {
    throw new Error("ITr2GenericParticleConstraint.ApplyConstraint must be implemented by a concrete constraint.");
  }

  /** Carbon's base debug hook is intentionally empty. */
  @meta.blue.method
  @meta.noop
  RenderDebugInfo()
  {
  }

}
