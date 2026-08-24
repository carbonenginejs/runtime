// Source: trinity/trinity/Particle/ITr2GenericParticleConstraint.h
import { CjsModel } from "#model";
import { carbon, impl, type } from "#schema";


/** Required particle-constraint contract. */
@type.define({ className: "ITr2GenericParticleConstraint", family: "particle" })
export class ITr2GenericParticleConstraint extends CjsModel
{

  /** Binds the constraint to the particle-system declaration. */
  @carbon.method
  @impl.abstract
  Bind(_particleSystem)
  {
    throw new Error("ITr2GenericParticleConstraint.Bind must be implemented by a concrete constraint.");
  }

  /** Applies the constraint to one particle-system update. */
  @carbon.method
  @impl.abstract
  ApplyConstraint(_buffers, _strides, _count, _dt)
  {
    throw new Error("ITr2GenericParticleConstraint.ApplyConstraint must be implemented by a concrete constraint.");
  }

  /** Carbon's base debug hook is intentionally empty. */
  @carbon.method
  @impl.noop
  RenderDebugInfo()
  {
  }

}
