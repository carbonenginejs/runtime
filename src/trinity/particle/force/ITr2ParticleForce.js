import { exposure as be } from "#be";
import { IRoot } from "../../../global/blue/IRoot.js";
// Source: trinity/trinity/Particle/ITr2ParticleForce.h
import { meta, blue } from "#schema";


/** Required particle-force contract. */
@blue.inherit(IRoot)
@be.interface("ITr2ParticleForce")
export class ITr2ParticleForce extends IRoot
{

  /** Updates force-owned state before particle integration. */
  @blue.abstract
  Update(_dt) {}

  /**
   * Carbon's `XMVECTOR GetForce( FXMVECTOR position, FXMVECTOR velocity,
   * float dt, float mass )` (ITr2ParticleForce.h:13): the force on one
   * particle.
   *
   * Adapted: Carbon returns the vector by value. Forces are evaluated per
   * particle per frame, so the vector is written into `out` and `out` is
   * returned, rather than allocated per call; every force returns `out`.
   * @param {vec3} _position The particle position.
   * @param {vec3} _velocity The particle velocity.
   * @param {number} _dt Frame time.
   * @param {number} _mass The particle mass.
   * @param {vec3} [_out] Receives the force.
   * @returns {vec3} out
   */
  @blue.abstract
  GetForce(_position, _velocity, _dt, _mass, _out) {}

  /**
   * Carbon's virtual `RenderDebugInfo( ITr2DebugRenderer2& renderer, const
   * Matrix& worldTransform, const CcpMath::AxisAlignedBox& aabb ) const`
   * (ITr2ParticleForce.h:14): the base body is empty, so a force that draws nothing
   * inherits this.
   *
   * @param {ITr2DebugRenderer2} _renderer The debug renderer.
   * @param {mat4} _worldTransform The owning particle system's world transform.
   * @param {box3} _aabb The particle system's bounds, packed min/max.
   */

  @meta.adapted
  RenderDebugInfo(_renderer, _worldTransform, _aabb)
  {
  }

}
