import { IRoot } from "../../../global/blue/IRoot.js";
// Source: trinity/trinity/Particle/ITr2GenericParticleConstraint.h
import { meta, blue } from "#schema";


/** Required particle-constraint contract. */
@blue.inherit(IRoot)
@blue.define("ITr2GenericParticleConstraint")
export class ITr2GenericParticleConstraint
{

  /**
   * Carbon's pure virtual `Bind( Tr2ParticleSystem* system )`
   * (ITr2GenericParticleConstraint.h:45): called when the constraint is added
   * to a particle system or the system is re-bound.
   *
   * @param {Tr2ParticleSystem} _particleSystem The owning particle system.
   */
  @blue.abstract
  Bind(_particleSystem) {}

  /**
   * Carbon's pure virtual `ApplyConstraint( const
   * ITr2GenericEmitter::UpdateArguments& arguments, float** particles,
   * unsigned* strides, unsigned count, float dt )`
   * (ITr2GenericParticleConstraint.h:36).
   *
   * @param {object} _arguments Arguments for child emitters.
   * @param {Array<Float32Array>} _particles Particle data, one array per element.
   * @param {Array<number>} _strides Floats per particle in each array.
   * @param {number} _count Number of particles.
   * @param {number} _dt Frame time.
   */
  @blue.abstract
  ApplyConstraint(_arguments, _particles, _strides, _count, _dt) {}

  /**
   * Carbon's virtual `RenderDebugInfo( ITr2DebugRenderer2& renderer, const
   * Matrix& worldTransform, const CcpMath::AxisAlignedBox& aabb ) const`
   * (ITr2GenericParticleConstraint.h:47): the base body is empty, so a constraint that draws nothing
   * inherits this.
   *
   * @param {ITr2DebugRenderer2} _renderer The debug renderer.
   * @param {mat4} _worldTransform The owning particle system's world transform.
   * @param {box3} _aabb The particle system's bounds, packed min/max.
   */
  @blue.method
  @meta.noop
  RenderDebugInfo(_renderer, _worldTransform, _aabb)
  {
  }

}
