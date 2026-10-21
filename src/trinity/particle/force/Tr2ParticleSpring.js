import { exposure as be } from "#be";
// Source: trinity/trinity/Particle/Tr2ParticleSpring.h
// Source: trinity/trinity/Particle/Tr2ParticleSpring.cpp
// Source: trinity/trinity/Particle/Tr2ParticleSpring_Blue.cpp
import { vec3 } from "#math/vec3";
import { ITr2ParticleForce } from "./ITr2ParticleForce.js";
import { meta, type, blue } from "#schema";
import { ITr2DebugRenderer2, Tr2DebugColor, Tr2DebugObjectReference } from "#interfaces";

// RenderDebugInfo scratch (debug drawing is single-threaded).
const DEBUG_CENTER = vec3.create();
const DEBUG_FROM = vec3.create();
const DEBUG_TO = vec3.create();


/**
 * Linear spring pulling particles toward a fixed position with a force
 * proportional to displacement.
 */
@be.mapInterface(ITr2ParticleForce)
@be.define("Tr2ParticleSpring")
export class Tr2ParticleSpring extends ITr2ParticleForce
{
  @blue.readwrite
  @blue.persist
  @type.vec3
  position = vec3.create();

  @blue.readwrite
  @blue.persist
  @type.float32
  springConstant = 0;

  /** Applies Carbon's linear spring force toward the configured origin. */
  @blue.method
  @meta.adapted
  GetForce(position, _velocity, _dt, _mass, out = vec3.create())
  {
    vec3.subtract(out, position, this.position);
    return vec3.scale(out, out, -this.springConstant);
  }

  /**
   * Nothing to advance per frame: the spring force depends only on each
   * particle's current position.
   */
  @blue.method
  @meta.noop
  Update(_dt)
  {
  }

  /**
   * Carbon Tr2ParticleSpring::RenderDebugInfo (Particle/Tr2ParticleSpring.cpp:42-50): a star of
   * four 20-unit diagonals through the world-space position, in 0xffaaaa00.
   * @param {ITr2DebugRenderer2} renderer The debug renderer.
   * @param {mat4} worldTransform The owning particle system's world transform.
   * @param {box3} _aabb The particle system's bounds, packed min/max.
   */
  @blue.method
  @meta.implemented
  RenderDebugInfo(renderer, worldTransform, _aabb)
  {
    const center = vec3.transformMat4(DEBUG_CENTER, this.position, worldTransform);
    const size = 10;
    const owner = Tr2DebugObjectReference.create__Object(this);
    const color = Tr2DebugColor.create__Uint32(0xffaaaa00);
    const from = DEBUG_FROM;
    const to = DEBUG_TO;

    renderer.DrawLine(owner, vec3.subtract(from, center, vec3.set(from, size, size, size)), vec3.add(to, center, vec3.set(to, size, size, size)), color);
    renderer.DrawLine(owner, vec3.subtract(from, center, vec3.set(from, -size, size, size)), vec3.add(to, center, vec3.set(to, -size, size, size)), color);
    renderer.DrawLine(owner, vec3.subtract(from, center, vec3.set(from, size, -size, size)), vec3.add(to, center, vec3.set(to, size, -size, size)), color);
    renderer.DrawLine(owner, vec3.subtract(from, center, vec3.set(from, size, size, -size)), vec3.add(to, center, vec3.set(to, size, size, -size)), color);
  }
}
