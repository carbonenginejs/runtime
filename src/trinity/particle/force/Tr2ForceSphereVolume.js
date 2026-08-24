// Source: trinity/trinity/Particle/Tr2ForceSphereVolume.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { impl, io, type } from "#schema";
import { ITr2ParticleForce } from "./ITr2ParticleForce.js";
import { vec3 } from "#math/vec3";

/** Aggregates child forces within a spherical region, scaling their combined contribution by a falloff toward the sphere's edge. */
@type.define({ className: "Tr2ForceSphereVolume", family: "particle" })
export class Tr2ForceSphereVolume extends ITr2ParticleForce
{

  // Per-instance scratch: volumes can nest other volumes, so a class-static
  // accumulator would alias between the outer and inner GetForce calls.
  #contribution = vec3.create();

  /** m_exponent (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  exponent = 1;

  /** m_forces (PITr2ParticleForceVector) [READ, PERSIST] */
  @io.persist
  @type.list("ITr2ParticleForce")
  forces = [];

  /** m_position (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  position = vec3.create();

  /** m_radius (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  radius = 1;

  /**
   * Carbon's Update is declared inline empty (Tr2ForceSphereVolume.h:20-22);
   * the contained forces intentionally do NOT receive per-frame updates
   * through the volume.
   */
  @impl.noop
  /**
   * Does nothing: the contained forces are not updated through the volume.
   */
  Update(_dt)
  {
  }

  /**
   * Child-force aggregation with (1 - d/r)^exponent falloff inside the sphere
   * (Tr2ForceSphereVolume.cpp:38-59).
   */
  @impl.adapted
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
      vec3.add(out, out, force.GetForce(position, velocity, dt, mass, contribution) ?? contribution);
    }
    return vec3.scale(out, out, Math.pow(1 - distance / this.radius, this.exponent));
  }

  // #delta is consumed into a scalar before any child GetForce runs, so a
  // class-static scratch cannot alias across nested volumes.
  static #delta = vec3.create();

}
