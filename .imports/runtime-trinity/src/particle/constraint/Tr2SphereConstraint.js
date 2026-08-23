// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Particle/Tr2SphereConstraint.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { Tr2ParticleElementDeclaration } from "../element/Tr2ParticleElementDeclaration.js";

/** A collision constraint that keeps particles outside or inside a sphere, reflecting velocity and triggering generators and emitters on contact. */
@type.define({ className: "Tr2SphereConstraint", family: "particle" })
export class Tr2SphereConstraint extends CjsModel
{

  #positionElement = null;

  #velocityElement = null;

  #radiusElement = null;

  /** m_affectPosition (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  affectPosition = true;

  /** m_affectVelocity (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  affectVelocity = true;

  /** m_position (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  position = vec3.create();

  /** m_radius (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  radius = 1;

  /** m_elasticity (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  elasticity = 1;

  /** m_friction (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  friction = 1;

  /** m_invertSphere (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  invertSphere = false;

  /** m_isValid (bool) [READ] */
  @io.read
  @type.boolean
  isValid = false;

  /** m_onCollisionEmitters (PITr2GenericEmitterVector) [READ, PERSIST] */
  @io.persist
  @type.list("ITr2GenericEmitter")
  onCollisionEmitters = [];

  /** m_generators (PITr2AttributeGeneratorVector) [READ, PERSIST] */
  @io.persist
  @type.list("ITr2AttributeGenerator")
  generators = [];

  /** m_particleRadiusComponent (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  particleRadiusComponent = "";

  /** m_reflectionNoise (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  reflectionNoise = 0;

  /** m_particleRadiusCoefficient (Vector4) [READWRITE, PERSIST] */
  @io.persist
  @type.vec4
  particleRadiusCoefficient = vec4.fromValues(1, 0, 0, 0);

  /**
   * Propagates the thread-safe flag to the on-collision emitters.
   */
  @impl.implemented
  Initialize()
  {
    for (const emitter of this.onCollisionEmitters)
    {
      emitter?.SetThreadSafeFlag?.();
    }
    return true;
  }

  /**
   * Resolves the position, velocity and radius elements and binds the attached generators, marking the constraint valid only when all of them resolve.
   */
  @impl.adapted
  Bind(particleSystem)
  {
    this.isValid = false;
    this.#positionElement = particleSystem?.GetElement?.(Tr2ParticleElementDeclaration.Type.POSITION) ?? null;
    this.#velocityElement = particleSystem?.GetElement?.(Tr2ParticleElementDeclaration.Type.VELOCITY) ?? null;
    this.#radiusElement = this.particleRadiusComponent
      ? particleSystem?.GetElement?.(this.particleRadiusComponent) ?? null
      : null;
    if (!this.#positionElement || (this.particleRadiusComponent && !this.#radiusElement))
    {
      return false;
    }
    const boundElements = new Set();
    for (const generator of this.generators)
    {
      if (typeof generator?.Bind !== "function")
      {
        throw new TypeError("Particle generators must implement Carbon's Bind contract.");
      }
      if (generator.Bind(particleSystem, boundElements) === false)
      {
        return false;
      }
    }
    this.isValid = true;
    return true;
  }

  /**
   * Carbon-faithful port of Tr2SphereConstraint::ApplyConstraint
   * (Tr2SphereConstraint.cpp:99-260) minus the TBB parallel-for wrapper:
   * inside-sphere response, swept segment-vs-sphere response, then generators
   * and on-collision emitters. Carbon only skips the generator/emitter block
   * via the swept branch's early continues - particles that neither collide
   * nor enter the swept test still fall through to it, and that control flow
   * is preserved.
   */
  @impl.adapted
  @impl.reason("Runs single-threaded against the CPU element views; Carbon's particle RNG is replaced by Math.random.")
  ApplyConstraint(_buffers, _strides, count, dt = 0)
  {
    if (!this.isValid)
    {
      return 0;
    }
    const invert = this.invertSphere ? -1 : 1;
    // Carbon compares against the CONSTRAINT radius (radiusCmp,
    // Tr2SphereConstraint.cpp:112); the per-particle radius only shifts the
    // projection target.
    const radiusCmp = this.radius * this.radius * invert;
    const offset = Tr2SphereConstraint.#offset;
    let processed = 0;
    for (let index = 0; index < count; index++)
    {
      const position = this.#view(this.#positionElement, index);
      const velocity = this.#velocityElement ? this.#view(this.#velocityElement, index) : null;
      let radius = this.radius;
      if (this.#radiusElement)
      {
        const particleRadius = this.#dotRadius(this.#view(this.#radiusElement, index));
        radius += this.invertSphere ? -particleRadius : particleRadius;
      }
      vec3.subtract(offset, position, this.position);
      const distanceSquared = vec3.squaredLength(offset);

      if (distanceSquared * invert < radiusCmp)
      {
        // Inside the prohibited space (Tr2SphereConstraint.cpp:142-178).
        if (this.affectPosition)
        {
          const length = Math.sqrt(distanceSquared);
          if (length > 0)
          {
            vec3.scale(offset, offset, 1 / length);
          }
          else
          {
            vec3.set(offset, 0, 1, 0);
          }
          vec3.scaleAndAdd(position, this.position, offset, radius);
          if (this.affectVelocity && velocity)
          {
            vec3.scale(offset, offset, invert);
            this.#reflectVelocity(velocity, offset);
          }
        }
      }
      else if (velocity)
      {
        // Swept segment-vs-sphere test (Tr2SphereConstraint.cpp:179-239).
        const a = vec3.squaredLength(velocity);
        const b = 2 * vec3.dot(velocity, offset);
        const c = distanceSquared - this.radius * this.radius;
        const determinant = b * b - 4 * a * c;
        if (determinant < 0 || a === 0)
        {
          continue;
        }
        const root = Math.sqrt(determinant);
        const time = this.invertSphere ? (-b + root) / (2 * a) : (-b - root) / (2 * a);
        if (time > dt || time < 0)
        {
          continue;
        }
        if (this.affectPosition)
        {
          vec3.scaleAndAdd(position, position, velocity, time);
          if (this.affectVelocity)
          {
            vec3.subtract(offset, position, this.position);
            vec3.normalize(offset, offset);
            vec3.scale(offset, offset, invert);
            this.#reflectVelocity(velocity, offset);
          }
        }
      }

      processed++;
      for (const generator of this.generators)
      {
        generator?.Generate?.(position, velocity, index);
      }
      for (const emitter of this.onCollisionEmitters)
      {
        emitter?.SpawnParticles?.(position, velocity, 1);
      }
    }
    return processed;
  }

  /**
   * Collision response (Tr2SphereConstraint.cpp:154-175): bounce/slide split
   * against the pre-normalized, invert-applied surface normal. When
   * reflectionNoise is set Carbon REPLACES the reflected velocity with
   * tangential noise scaled by the post-bounce speed (cpp:162-173) - unlike
   * the plane constraint, which adds it.
   */
  #reflectVelocity(velocity, normal)
  {
    const velocityDot = vec3.dot(velocity, normal);
    if (velocityDot >= 0)
    {
      return;
    }
    const bounce = Tr2SphereConstraint.#bounce;
    vec3.scale(bounce, normal, -velocityDot);
    const slide = Tr2SphereConstraint.#slide;
    vec3.add(slide, velocity, bounce);
    vec3.scale(bounce, bounce, this.elasticity);
    vec3.scale(slide, slide, this.friction);
    vec3.add(velocity, bounce, slide);
    if (this.reflectionNoise > 0)
    {
      const noise = Tr2SphereConstraint.#noise;
      vec3.set(noise, Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
      vec3.scale(noise, noise, this.reflectionNoise);
      vec3.scaleAndAdd(noise, noise, normal, -vec3.dot(noise, normal));
      vec3.scale(velocity, noise, vec3.length(velocity));
    }
  }

  /**
   * A typed-array view onto one particle's slot within a bound element's buffer.
   */
  #view(element, index)
  {
    const offset = element.startOffset + index * element.instanceStride;
    return element.buffer.subarray(offset, offset + element.dimension);
  }

  /**
   * The effective particle radius, from the radius element dotted against the radius coefficient.
   */
  #dotRadius(value)
  {
    let result = 0;
    for (let component = 0; component < Math.min(4, value.length); component++)
    {
      result += value[component] * this.particleRadiusCoefficient[component];
    }
    return result;
  }

  static #bounce = vec3.create();

  static #noise = vec3.create();

  static #offset = vec3.create();

  static #slide = vec3.create();

}
