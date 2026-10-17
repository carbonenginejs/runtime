// Source: trinity/trinity/Particle/Tr2ForceSphereVolume.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta, type, blue } from "#schema";
import { ITr2ParticleForce } from "./ITr2ParticleForce.js";
import { vec3 } from "#math/vec3";
import { ITr2DebugRenderer2, Tr2DebugColor, Tr2DebugObjectReference } from "#interfaces";

/** Aggregates child forces within a spherical region, scaling their combined contribution by a falloff toward the sphere's edge. */
@blue.interface(ITr2ParticleForce)
@blue.define("Tr2ForceSphereVolume")
export class Tr2ForceSphereVolume extends ITr2ParticleForce
{

  // Per-instance scratch: volumes can nest other volumes, so a class-static
  // accumulator would alias between the outer and inner GetForce calls.
  #contribution = vec3.create();

  /** m_exponent (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  exponent = 1;

  /** m_forces (PITr2ParticleForceVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("ITr2ParticleForce")
  forces = [];

  /** m_position (Vector3) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.vec3
  position = vec3.create();

  /** m_radius (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  radius = 1;

  /**
   * Carbon's Update is declared inline empty (Tr2ForceSphereVolume.h:20-22);
   * the contained forces intentionally do NOT receive per-frame updates
   * through the volume.
   */
  /**
   * Does nothing: the contained forces are not updated through the volume.
   */
  @blue.method
  @meta.noop
  Update(_dt)
  {
  }

  /**
   * Child-force aggregation with (1 - d/r)^exponent falloff inside the sphere
   * (Tr2ForceSphereVolume.cpp:38-59).
   */
  @blue.method
  @meta.adapted
  GetForce(position, velocity, dt, mass, out = vec3.create())
  {
    vec3.set(out, 0, 0, 0);
    const delta = Tr2ForceSphereVolume.#delta;
    vec3.subtract(delta, position, this.position);
    const distance = vec3.length(delta);
    if (!(distance < this.radius))
    {
      return out;
    }
    const contribution = this.#contribution;
    for (const force of this.forces)
    {
      vec3.set(contribution, 0, 0, 0);
      vec3.add(out, out, force.GetForce(position, velocity, dt, mass, contribution));
    }
    return vec3.scale(out, out, Math.pow(1 - distance / this.radius, this.exponent));
  }

  /**
   * Carbon Tr2ForceSphereVolume::RenderDebugInfo (Particle/Tr2ForceSphereVolume.cpp:61-68):
   * the volume as a 20-segment wireframe sphere in 0xffaaaa00, then every
   * contained force with the same arguments.
   * @param {ITr2DebugRenderer2} renderer The debug renderer.
   * @param {mat4} worldTransform The owning particle system's world transform.
   * @param {box3} aabb The particle system's bounds, packed min/max.
   */
  @blue.method
  @meta.implemented
  RenderDebugInfo(renderer, worldTransform, aabb)
  {
    renderer.DrawSphere__TransformCenterRadius(
      Tr2DebugObjectReference.create__Object(this),
      worldTransform,
      this.position,
      this.radius,
      20,
      ITr2DebugRenderer2.Effect.Wireframe,
      Tr2DebugColor.create__Uint32(0xffaaaa00));

    for (const force of this.forces)
    {
      force.RenderDebugInfo(renderer, worldTransform, aabb);
    }
  }

  // #delta is consumed into a scalar before any child GetForce runs, so a
  // class-static scratch cannot alias across nested volumes.
  static #delta = vec3.create();

}
