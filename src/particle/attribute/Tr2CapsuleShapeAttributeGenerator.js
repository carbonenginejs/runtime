// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Particle/Tr2CapsuleShapeAttributeGenerator.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { quat } from "@carbonenginejs/runtime-utils/quat";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { bindParticleElement } from "../element/particleElementBinding.js";
import { Tr2ParticleElementDeclaration } from "../element/Tr2ParticleElementDeclaration.js";

/** Generates particle position and velocity offsets sampled within a capsule volume interpolated between a start and end transform. */
@type.define({ className: "Tr2CapsuleShapeAttributeGenerator", family: "particle" })
export class Tr2CapsuleShapeAttributeGenerator extends CjsModel
{

  #positionElement = null;

  #velocityElement = null;

  /** m_minPhi (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  minPhi = 0;

  /** m_maxPhi (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  maxPhi = 360;

  /** m_minTheta (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  minTheta = 0;

  /** m_maxTheta (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  maxTheta = 360;

  /** m_controlVelocity (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  controlVelocity = true;

  /** m_positionEnd (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  positionEnd = vec3.create();

  /** m_rotationStart (Quaternion) [READWRITE, PERSIST] */
  @io.persist
  @type.quat
  rotationStart = quat.create();

  /** m_rotationEnd (Quaternion) [READWRITE, PERSIST] */
  @io.persist
  @type.quat
  rotationEnd = quat.create();

  /** m_positionStart (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  positionStart = vec3.create();

  /** m_parentVelocityFactor (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  parentVelocityFactor = 1;

  /** m_maxSpeed (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  maxSpeed = 0;

  /** m_minSpeed (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  minSpeed = 0;

  /** m_maxRadius (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  maxRadius = 0;

  /** m_minRadius (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  minRadius = 0;

  /** m_valid (bool) [READ] */
  @io.read
  @type.boolean
  valid = false;

  /**
   * Resolves the position element, and the velocity element when velocity control is enabled, marking the generator valid only when both required elements resolve.
   */
  @impl.implemented
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
   */
  @impl.adapted
  @impl.reason("Carbon's particle RNG is replaced by Math.random while retaining its capsule sampling and interpolation order.")
  Generate(parentPosition, parentVelocity, index)
  {
    if (!this.valid)
    {
      return;
    }
    const phi = (this.minPhi + Math.random() * (this.maxPhi - this.minPhi)) * Math.PI / 180;
    const theta = (this.minTheta + Math.random() * (this.maxTheta - this.minTheta)) * Math.PI / 180;
    const direction = Tr2CapsuleShapeAttributeGenerator.#direction;
    vec3.set(
      direction,
      Math.sin(phi) * Math.cos(theta),
      -Math.cos(phi),
      Math.sin(phi) * Math.sin(theta)
    );

    const amount = Math.random();
    const rotation = quat.slerp(
      Tr2CapsuleShapeAttributeGenerator.#rotation,
      this.rotationStart,
      this.rotationEnd,
      amount
    );
    vec3.transformQuat(direction, direction, rotation);

    if (this.#velocityElement)
    {
      const speed = this.minSpeed + Math.random() * (this.maxSpeed - this.minSpeed);
      const offset = this.#velocityElement.startOffset + index * this.#velocityElement.instanceStride;
      for (let component = 0; component < 3; component++)
      {
        this.#velocityElement.buffer[offset + component] = direction[component] * speed
          + (parentVelocity?.[component] ?? 0) * this.parentVelocityFactor;
      }
    }

    const radius = this.minRadius + Math.random() * (this.maxRadius - this.minRadius);
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
  @impl.implemented
  GetName()
  {
    return this.controlVelocity ? "POSITION + VELOCITY" : "POSITION";
  }

  /**
   * Copies the given start and end positions and rotations into the capsule endpoints.
   */
  @impl.implemented
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
