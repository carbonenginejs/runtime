import { exposure as be } from "#be";
import { random as carbonRandom } from "#math/random";
// Source: trinity/trinity/Particle/Tr2CapsuleShapeAttributeGenerator.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta, type, blue } from "#schema";
import { ITr2AttributeGenerator } from "./ITr2AttributeGenerator.js";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { bindParticleElement } from "../element/particleElementBinding.js";
import { Tr2ParticleElementDeclaration } from "../element/Tr2ParticleElementDeclaration.js";

/** Generates particle position and velocity offsets sampled within a capsule volume interpolated between a start and end transform. */
@be.mapInterface(ITr2AttributeGenerator)
@be.define("Tr2CapsuleShapeAttributeGenerator")
export class Tr2CapsuleShapeAttributeGenerator extends ITr2AttributeGenerator
{

  #positionElement = null;

  #velocityElement = null;

  /** m_minPhi (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  minPhi = 0;

  /** m_maxPhi (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  maxPhi = 360;

  /** m_minTheta (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  minTheta = 0;

  /** m_maxTheta (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  maxTheta = 360;

  /** m_controlVelocity (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  controlVelocity = true;

  /** m_positionEnd (Vector3) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.vec3
  positionEnd = vec3.create();

  /** m_rotationStart (Quaternion) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.quat
  rotationStart = quat.create();

  /** m_rotationEnd (Quaternion) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.quat
  rotationEnd = quat.create();

  /** m_positionStart (Vector3) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.vec3
  positionStart = vec3.create();

  /** m_parentVelocityFactor (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  parentVelocityFactor = 1;

  /** m_maxSpeed (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  maxSpeed = 0;

  /** m_minSpeed (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  minSpeed = 0;

  /** m_maxRadius (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  maxRadius = 0;

  /** m_minRadius (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  minRadius = 0;

  /** m_valid (bool) [READ] */
  @blue.read
  @type.boolean
  valid = false;

  /**
   * Carbon MAP_PROPERTY_READONLY "name" over GetName
   * (Tr2CapsuleShapeAttributeGenerator_Blue.cpp:15): the elements the generator
   * writes. Carbon's description reuses the element-name wording.
   */
  @blue.property()
  @type.string
  @meta.implemented
  get name()
  {
    return this.GetName();
  }

  /**
   * Resolves the position element, and the velocity element when velocity control is enabled, marking the generator valid only when both required elements resolve.
   */
  @blue.method
  @meta.implemented
  Bind(particleSystem, boundElements)
  {
    this.#positionElement = bindParticleElement(
      particleSystem,
      Tr2ParticleElementDeclaration.Type.POSITION,
      boundElements
    );
    this.#velocityElement = this.controlVelocity
      ? bindParticleElement(
        particleSystem,
        Tr2ParticleElementDeclaration.Type.VELOCITY,
        boundElements
      )
      : null;
    this.valid = !!this.#positionElement
      && (!this.controlVelocity || !!this.#velocityElement);
    return this.valid;
  }

  /**
   * Samples a random cone direction and capsule interpolation point to write one particle's velocity and position offset from the parent transform.
   *
   * Uses the shared particle RNG for capsule sampling and interpolation.
   */
  @blue.method
  @meta.adapted
  Generate(parentPosition, parentVelocity, index)
  {
    if (!this.valid)
    {
      return;
    }
    const phi = (this.minPhi + carbonRandom.particleRandFloat() * (this.maxPhi - this.minPhi)) * Math.PI / 180;
    const theta = (this.minTheta + carbonRandom.particleRandFloat() * (this.maxTheta - this.minTheta)) * Math.PI / 180;
    const direction = Tr2CapsuleShapeAttributeGenerator.#direction;
    vec3.set(
      direction,
      Math.sin(phi) * Math.cos(theta),
      -Math.cos(phi),
      Math.sin(phi) * Math.sin(theta)
    );

    const amount = carbonRandom.particleRandFloat();
    const rotation = quat.slerp(
      Tr2CapsuleShapeAttributeGenerator.#rotation,
      this.rotationStart,
      this.rotationEnd,
      amount
    );
    vec3.transformQuat(direction, direction, rotation);

    if (this.#velocityElement)
    {
      const speed = this.minSpeed + carbonRandom.particleRandFloat() * (this.maxSpeed - this.minSpeed);
      const offset = this.#velocityElement.startOffset + index * this.#velocityElement.instanceStride;
      for (let component = 0; component < 3; component++)
      {
        this.#velocityElement.buffer[offset + component] = direction[component] * speed
          + (parentVelocity?.[component] ?? 0) * this.parentVelocityFactor;
      }
    }

    const radius = this.minRadius + carbonRandom.particleRandFloat() * (this.maxRadius - this.minRadius);
    const position = vec3.lerp(
      Tr2CapsuleShapeAttributeGenerator.#position,
      this.positionStart,
      this.positionEnd,
      amount
    );
    const offset = this.#positionElement.startOffset + index * this.#positionElement.instanceStride;
    for (let component = 0; component < 3; component++)
    {
      this.#positionElement.buffer[offset + component] = direction[component] * radius
        + position[component]
        + (parentPosition?.[component] ?? 0);
    }
  }

  /**
   * A label saying whether the generator controls position only, or position and velocity.
   */
  @blue.method
  @meta.implemented
  GetName()
  {
    return this.controlVelocity ? "POSITION + VELOCITY" : "POSITION";
  }

  /**
   * Copies the given start and end positions and rotations into the capsule endpoints.
   */
  @blue.method
  @meta.implemented
  SetPositions(startPosition, startRotation, endPosition, endRotation)
  {
    vec3.copy(this.positionStart, startPosition);
    quat.copy(this.rotationStart, startRotation);
    vec3.copy(this.positionEnd, endPosition);
    quat.copy(this.rotationEnd, endRotation);
  }

  static #direction = vec3.create();

  static #rotation = quat.create();

  static #position = vec3.create();

}
