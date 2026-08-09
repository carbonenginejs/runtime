// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Particle/Tr2SphereShapeAttributeGenerator.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { quat } from "@carbonenginejs/runtime-utils/quat";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { bindParticleElement } from "./particleElementBinding.js";
import { Tr2ParticleElementDeclaration } from "./Tr2ParticleElementDeclaration.js";

/** Generates particle position and velocity offsets sampled within a rotated spherical cone and radius range. */
@type.define({ className: "Tr2SphereShapeAttributeGenerator", family: "particle" })
export class Tr2SphereShapeAttributeGenerator extends CjsModel
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

  /** m_distributionExponent (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  distributionExponent = 1;

  /** m_controlPosition (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  controlPosition = true;

  /** m_controlVelocity (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  controlVelocity = true;

  /** m_rotation (Quaternion) [READWRITE, PERSIST] */
  @io.persist
  @type.quat
  rotation = quat.create();

  /** m_position (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  position = vec3.create();

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
   * Resolves the position and velocity elements according to the control flags, marking the generator valid only when every required element resolves.
   */
  @impl.implemented
  Bind(particleSystem, boundElements)
  {
    this.#positionElement = this.controlPosition
      ? bindParticleElement(
        particleSystem,
        Tr2ParticleElementDeclaration.Type.POSITION,
        boundElements
      )
      : null;
    this.#velocityElement = this.controlVelocity
      ? bindParticleElement(
        particleSystem,
        Tr2ParticleElementDeclaration.Type.VELOCITY,
        boundElements
      )
      : null;
    this.valid = (!this.controlPosition || !!this.#positionElement)
      && (!this.controlVelocity || !!this.#velocityElement);
    return this.valid;
  }

  /**
   * Samples a direction within the configured cone and radius range to write one particle's position and velocity offset.
   */
  @impl.adapted
  @impl.reason("Carbon's particle RNG is replaced by Math.random while retaining its cone sampling, rotation and distribution-exponent order.")
  Generate(parentPosition, parentVelocity, index)
  {
    if (!this.valid || (!this.controlPosition && !this.controlVelocity))
    {
      return;
    }
    const phi = (this.minPhi + Math.random() * (this.maxPhi - this.minPhi)) * Math.PI / 180;
    const theta = (this.minTheta + Math.random() * (this.maxTheta - this.minTheta)) * Math.PI / 180;
    const direction = Tr2SphereShapeAttributeGenerator.#direction;
    vec3.set(
      direction,
      Math.sin(phi) * Math.cos(theta),
      -Math.cos(phi),
      Math.sin(phi) * Math.sin(theta)
    );
    // Carbon's XMQuaternionMultiply(XMQuaternionMultiply(conj(q), v), q)
    // (Tr2SphereShapeAttributeGenerator.cpp:87-89) is the standard active
    // rotation q * v * q^-1 - exactly vec3.transformQuat.
    vec3.transformQuat(direction, direction, this.rotation);
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
    if (this.#positionElement)
    {
      // frand(min, max, exponent) = min + (max - min) * pow(rand, exponent)
      // (Tr2SphereShapeAttributeGenerator.cpp:21-24).
      const radius = this.minRadius
        + (this.maxRadius - this.minRadius) * Math.pow(Math.random(), this.distributionExponent);
      const offset = this.#positionElement.startOffset + index * this.#positionElement.instanceStride;
      for (let component = 0; component < 3; component++)
      {
        this.#positionElement.buffer[offset + component] = direction[component] * radius
          + this.position[component]
          + (parentPosition?.[component] ?? 0);
      }
    }
  }

  /**
   * A label saying whether the generator controls position, velocity, both, or neither.
   */
  @impl.implemented
  GetName()
  {
    return this.controlPosition
      ? this.controlVelocity ? "POSITION + VELOCITY" : "POSITION"
      : this.controlVelocity ? "VELOCITY" : "NONE";
  }

  /** Carbon returns via reference arguments (Tr2SphereShapeAttributeGenerator.cpp:215-219). */
  @impl.adapted
  /**
   * Writes the generator's current position and rotation into the caller's vector and quaternion.
   */
  @impl.reason("Carbon's paired reference outputs become caller-provided out arguments.")
  GetTransform(outPosition, outRotation)
  {
    vec3.copy(outPosition, this.position);
    quat.copy(outRotation, this.rotation);
  }

  /**
   * Copies the given position and rotation into the generator's transform.
   */
  @impl.implemented
  SetTransform(position, rotation)
  {
    vec3.copy(this.position, position);
    quat.copy(this.rotation, rotation);
  }

  static #direction = vec3.create();

}
