import { exposure as be } from "#be";
// Source: trinity/trinity/Particle/Tr2ParticleAttractorForce.h
// Source: trinity/trinity/Particle/Tr2ParticleAttractorForce.cpp
// Source: trinity/trinity/Particle/Tr2ParticleAttractorForce_Blue.cpp
import { vec3 } from "#math/vec3";
import { ITr2ParticleForce } from "./ITr2ParticleForce.js";
import { meta, type, blue } from "#schema";
import { ITr2DebugRenderer2, Tr2DebugColor, Tr2DebugObjectReference } from "#interfaces";

// RenderDebugInfo scratch (debug drawing is single-threaded).
const DEBUG_CENTER = vec3.create();
const DEBUG_FROM = vec3.create();
const DEBUG_TO = vec3.create();


/**
 * Particle force of constant magnitude pointing at a fixed position, regardless
 * of distance.
 */
@be.mapInterface(ITr2ParticleForce)
@be.define("Tr2ParticleAttractorForce")
export class Tr2ParticleAttractorForce extends ITr2ParticleForce
{
  @blue.readwrite
  @blue.persist
  @type.vec3
  position = vec3.create();

  @blue.readwrite
  @blue.persist
  @type.float32
  magnitude = 1;

  /** Applies a constant-magnitude force toward the configured origin. */
  @blue.method
  @meta.adapted
  GetForce(position, _velocity, _dt, _mass, out = vec3.create())
  {
    const f = Math.fround;
    let x = f(f(this.position[0]) - f(position[0]));
    let y = f(f(this.position[1]) - f(position[1]));
    let z = f(f(this.position[2]) - f(position[2]));
    vec3.set(out, x, y, z);
    const reciprocal = vec3.reciprocalLengthEstSse(out);
    const magnitude = f(this.magnitude);
    // Carbon selects zero only for a +infinity reciprocal, then scales.
    // Keep normalization and magnitude as separate float32 multiplies.
    return reciprocal === Infinity
      ? vec3.set(out, f(0 * magnitude), f(0 * magnitude), f(0 * magnitude))
      : vec3.set(out, f(f(x * reciprocal) * magnitude), f(f(y * reciprocal) * magnitude), f(f(z * reciprocal) * magnitude));
  }

  /**
   * Nothing to advance per frame: the force depends only on the authored
   * position and magnitude.
   */
  @blue.method
  @meta.noop
  Update(_dt)
  {
  }

  /**
   * Carbon Tr2ParticleAttractorForce::RenderDebugInfo (Particle/Tr2ParticleAttractorForce.cpp:45-53): a star of
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
