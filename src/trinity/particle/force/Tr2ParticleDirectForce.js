import { exposure as be } from "#be";
// Source: trinity/trinity/Particle/Tr2ParticleDirectForce.h
// Source: trinity/trinity/Particle/Tr2ParticleDirectForce.cpp
// Source: trinity/trinity/Particle/Tr2ParticleDirectForce_Blue.cpp
import { vec3 } from "#math/vec3";
import { ITr2ParticleForce } from "./ITr2ParticleForce.js";
import { meta, type, blue } from "#schema";
import { ITr2DebugRenderer2, Tr2DebugColor, Tr2DebugObjectReference } from "#interfaces";

// RenderDebugInfo scratch (debug drawing is single-threaded).
const DEBUG_ORIGIN = vec3.create();
const DEBUG_P0 = vec3.create();
const DEBUG_P1 = vec3.create();


/** Constant particle force vector, applied identically to every particle. */
@be.mapInterface(ITr2ParticleForce)
@be.define("Tr2ParticleDirectForce")
export class Tr2ParticleDirectForce extends ITr2ParticleForce
{
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.vec3
  force = vec3.fromValues(1, 1, 1);

  /** Copies the authored constant force into caller-owned output. */

  @meta.adapted
  GetForce(_position, _velocity, _dt, _mass, out = vec3.create())
  {
    return vec3.copy(out, this.force);
  }

  /**
   * Nothing to advance per frame: the force vector is authored and never
   * changes.
   */

  @meta.adapted
  Update(_dt)
  {
  }

  /**
   * Carbon Tr2ParticleDirectForce::RenderDebugInfo (Particle/Tr2ParticleDirectForce.cpp:40-46):
   * a 10-segment wireframe arrow from the world-space origin to the force
   * vector taken as a world-space point, radius max(length * 0.1, 0.1), head
   * 0.4 of its length, in 0xffaaaa00.
   * @param {ITr2DebugRenderer2} renderer The debug renderer.
   * @param {mat4} worldTransform The owning particle system's world transform.
   * @param {box3} _aabb The particle system's bounds, packed min/max.
   */

  @meta.implemented
  RenderDebugInfo(renderer, worldTransform, _aabb)
  {
    const f = Math.fround;
    const p0 = vec3.transformMat4(DEBUG_P0, DEBUG_ORIGIN, worldTransform);
    const p1 = vec3.transformMat4(DEBUG_P1, this.force, worldTransform);
    const len = f(vec3.distance(p0, p1));
    // std::max( a, b ) returns b only when a < b.
    const scaled = f(len * f(0.1));
    const radius = scaled < f(0.1) ? f(0.1) : scaled;

    renderer.DrawArrow(
      Tr2DebugObjectReference.create__Object(this),
      p0,
      p1,
      radius,
      f(0.4),
      10,
      ITr2DebugRenderer2.Effect.Wireframe,
      Tr2DebugColor.create__Uint32(0xffaaaa00));
  }
}
