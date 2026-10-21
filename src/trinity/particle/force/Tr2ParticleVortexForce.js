import { exposure as be } from "#be";
// Source: trinity/trinity/Particle/Tr2ParticleVortexForce.h
// Source: trinity/trinity/Particle/Tr2ParticleVortexForce.cpp
// Source: trinity/trinity/Particle/Tr2ParticleVortexForce_Blue.cpp
import { vec3 } from "#math/vec3";
import { mat4 } from "#math/mat4";
import { ITr2ParticleForce } from "./ITr2ParticleForce.js";
import { meta, type, blue } from "#schema";
import { ITr2DebugRenderer2, Tr2DebugColor, Tr2DebugObjectReference } from "#interfaces";

// DirectXMath XM_2PI as the float Carbon multiplies by.
const XM_2PI = Math.fround(6.283185307);

// RenderDebugInfo scratch (debug drawing is single-threaded).
const DEBUG_BASIS = mat4.create();
const DEBUG_TRANSLATION = mat4.create();
const DEBUG_LOCAL = mat4.create();
const DEBUG_WORLD = mat4.create();
const DEBUG_P0 = vec3.create();
const DEBUG_P1 = vec3.create();


/**
 * Particle force of constant magnitude directed tangentially around an axis
 * through a fixed position, swirling particles about it.
 */
@be.mapInterface(ITr2ParticleForce)
@be.define("Tr2ParticleVortexForce")
export class Tr2ParticleVortexForce extends ITr2ParticleForce
{
  @blue.readwrite
  @blue.persist
  @type.float32
  magnitude = 1;

  @blue.readwrite
  @blue.persist
  @type.vec3
  axis = vec3.fromValues(0, 1, 0);

  @blue.readwrite
  @blue.persist
  @type.vec3
  position = vec3.create();

  /** Applies Carbon's normalized tangential vortex force. */
  @blue.method
  @meta.adapted
  GetForce(position, _velocity, _dt, _mass, out = vec3.create())
  {
    const f = Math.fround;
    let x = f(f(this.position[0]) - f(position[0]));
    let y = f(f(this.position[1]) - f(position[1]));
    let z = f(f(this.position[2]) - f(position[2]));
    const ax = f(this.axis[0]), ay = f(this.axis[1]), az = f(this.axis[2]);
    const cx = f(f(y * az) - f(z * ay));
    const cy = f(f(z * ax) - f(x * az));
    const cz = f(f(x * ay) - f(y * ax));
    x = cx; y = cy; z = cz;
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
   * Nothing to advance per frame: the vortex is fully described by its axis,
   * position and magnitude.
   */
  @blue.method
  @meta.noop
  Update(_dt)
  {
  }

  /**
   * Carbon Tr2ParticleVortexForce::RenderDebugInfo (Particle/Tr2ParticleVortexForce.cpp:49-63):
   * in the frame whose Z is the vortex axis at the vortex position, a line
   * along Z from -20 to 20 and a 16-segment circle of radius 20 in the XY
   * plane, all in 0xffaaaa00.
   * @param {ITr2DebugRenderer2} renderer The debug renderer.
   * @param {mat4} worldTransform The owning particle system's world transform.
   * @param {box3} _aabb The particle system's bounds, packed min/max.
   */
  @blue.method
  @meta.implemented
  RenderDebugInfo(renderer, worldTransform, _aabb)
  {
    const f = Math.fround;
    const basis = mat4.orthoNormalBasisZ(DEBUG_BASIS, this.axis);
    const translation = mat4.fromTranslation(DEBUG_TRANSLATION, this.position);
    // Carbon (row-vector): OrthoNormalBasisZ( m_axis ) * TranslationMatrix( m_position ) * worldTransform.
    const local = mat4.multiply(DEBUG_LOCAL, translation, basis);
    const world = mat4.multiply(DEBUG_WORLD, worldTransform, local);
    const radius = 20;
    const owner = Tr2DebugObjectReference.create__Object(this);
    const color = Tr2DebugColor.create__Uint32(0xffaaaa00);
    const p0 = DEBUG_P0;
    const p1 = DEBUG_P1;

    vec3.transformMat4(p0, vec3.set(p0, 0, 0, -radius), world);
    vec3.transformMat4(p1, vec3.set(p1, 0, 0, radius), world);
    renderer.DrawLine(owner, p0, p1, color);

    for (let i = 0; i < 16; ++i)
    {
      const angle0 = f(f(i / 16) * XM_2PI);
      const angle1 = f(f((i + 1) / 16) * XM_2PI);
      vec3.set(p0, f(f(Math.cos(angle0)) * radius), f(f(Math.sin(angle0)) * radius), 0);
      vec3.set(p1, f(f(Math.cos(angle1)) * radius), f(f(Math.sin(angle1)) * radius), 0);
      renderer.DrawLine(owner, vec3.transformMat4(p0, p0, world), vec3.transformMat4(p1, p1, world), color);
    }
  }
}
