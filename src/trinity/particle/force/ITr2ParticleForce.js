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
  @blue.method
  @meta.noop
  RenderDebugInfo(_renderer, _worldTransform, _aabb)
  {
  }

}
