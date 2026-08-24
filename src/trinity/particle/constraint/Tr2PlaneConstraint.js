// Source: trinity/trinity/Particle/Tr2PlaneConstraint.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { impl, io, type } from "#schema";
import { ITr2GenericParticleConstraint } from "./ITr2GenericParticleConstraint.js";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { Tr2ParticleElementDeclaration } from "../element/Tr2ParticleElementDeclaration.js";

/** A collision constraint that keeps particles on one side of a plane, reflecting velocity with elasticity, friction and noise, and triggering generators and emitters on contact. */
@type.define({ className: "Tr2PlaneConstraint", family: "particle" })
export class Tr2PlaneConstraint extends ITr2GenericParticleConstraint
{

  #normalizedPlane = vec4.fromValues(0, 1, 0, 0);

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

  /** m_plane (Vector4) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.vec4
  plane = vec4.fromValues(0, 1, 0, 0);

  /** m_elasticity (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  elasticity = 1;

  /** m_friction (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  friction = 1;

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
   * Normalises the constraint plane and propagates the thread-safe flag to the on-collision emitters.
   */
  @impl.implemented
  Initialize()
  {
    this.#normalizePlane();
    for (const emitter of this.onCollisionEmitters)
    {
      emitter.SetThreadSafeFlag();
    }
    return true;
  }

  /**
   * Renormalises the cached plane whenever the plane property changes.
   */
  @impl.implemented
  OnModified(propertyName)
  {
    if (!propertyName || propertyName === "plane")
    {
      this.#normalizePlane();
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
    this.#positionElement = particleSystem.GetElement(Tr2ParticleElementDeclaration.Type.POSITION);
    this.#velocityElement = particleSystem.GetElement(Tr2ParticleElementDeclaration.Type.VELOCITY);
    this.#radiusElement = this.particleRadiusComponent
      ? particleSystem.GetElement(this.particleRadiusComponent)
      : null;
    if (!this.#positionElement || (this.particleRadiusComponent && !this.#radiusElement))
    {
      return false;
    }
    const boundElements = new Set();
    for (const generator of this.generators)
    {
      if (generator.Bind(particleSystem, boundElements) === false)
      {
        return false;
      }
    }
    this.#normalizePlane();
    this.isValid = true;
    return true;
  }

  /**
   * Pushes particles that crossed the plane back to its surface, reflects their velocity with elasticity, friction and noise, and fires the generators and on-collision emitters.
   */
  @impl.adapted
  ApplyConstraint(_buffers, _strides, count)
  {
    if (!this.isValid)
    {
      return 0;
    }
    const normal = this.#normalizedPlane;
    let collisions = 0;
    for (let index = 0; index < count; index++)
    {
      const position = this.#view(this.#positionElement, index);
      const velocity = this.#velocityElement ? this.#view(this.#velocityElement, index) : null;
      const radius = this.#radiusElement
        ? this.#dotRadius(this.#view(this.#radiusElement, index))
        : 0;
      const distance = normal[0] * position[0] + normal[1] * position[1]
        + normal[2] * position[2] + normal[3] - radius;
      const velocityDot = velocity
        ? velocity[0] * normal[0] + velocity[1] * normal[1] + velocity[2] * normal[2]
        : -1;
      if (distance > 0 || velocityDot >= 0)
      {
        continue;
      }
      collisions++;
      if (this.affectPosition)
      {
        position[0] -= normal[0] * distance;
        position[1] -= normal[1] * distance;
        position[2] -= normal[2] * distance;
      }
      if (this.affectVelocity && velocity)
      {
        const bounceScale = -velocityDot * this.elasticity;
        const slideX = (velocity[0] - normal[0] * velocityDot) * this.friction;
        const slideY = (velocity[1] - normal[1] * velocityDot) * this.friction;
        const slideZ = (velocity[2] - normal[2] * velocityDot) * this.friction;
        velocity[0] = normal[0] * bounceScale + slideX;
        velocity[1] = normal[1] * bounceScale + slideY;
        velocity[2] = normal[2] * bounceScale + slideZ;
        this.#addReflectionNoise(velocity, normal);
      }
      for (const generator of this.generators)
      {
        generator.Generate(position, velocity, index);
      }
      for (const emitter of this.onCollisionEmitters)
      {
        emitter.SpawnParticles(position, velocity, 1);
      }
    }
    return collisions;
  }

  /**
   * Recomputes the cached unit-normal plane, falling back to the default up plane when the normal is degenerate.
   */
  #normalizePlane()
  {
    const length = Math.hypot(this.plane[0], this.plane[1], this.plane[2]);
    if (length > 0)
    {
      vec4.scale(this.#normalizedPlane, this.plane, 1 / length);
    }
    else
    {
      vec4.set(this.#normalizedPlane, 0, 1, 0, 0);
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

  /**
   * Carbon adds tangential noise scaled by the post-bounce speed to the
   * reflected velocity (Tr2PlaneConstraint.cpp:154-165).
   */
  #addReflectionNoise(velocity, normal)
  {
    if (this.reflectionNoise <= 0)
    {
      return;
    }
    const noise = Tr2PlaneConstraint.#noise;
    vec3.set(noise, Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
    vec3.scale(noise, noise, this.reflectionNoise);
    vec3.scaleAndAdd(noise, noise, normal, -vec3.dot(noise, normal));
    vec3.scaleAndAdd(velocity, velocity, noise, vec3.length(velocity));
  }

  static #noise = vec3.create();

}
