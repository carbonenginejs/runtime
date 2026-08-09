import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { bindParticleElement } from '../element/particleElementBinding.js';
import { Tr2ParticleElementDeclaration as _Tr2ParticleElementDe } from '../element/Tr2ParticleElementDeclaration.js';

let _initProto, _initClass, _init_minPhi, _init_extra_minPhi, _init_maxPhi, _init_extra_maxPhi, _init_minTheta, _init_extra_minTheta, _init_maxTheta, _init_extra_maxTheta, _init_distributionExponent, _init_extra_distributionExponent, _init_controlPosition, _init_extra_controlPosition, _init_controlVelocity, _init_extra_controlVelocity, _init_rotation, _init_extra_rotation, _init_position, _init_extra_position, _init_parentVelocityFactor, _init_extra_parentVelocityFactor, _init_maxSpeed, _init_extra_maxSpeed, _init_minSpeed, _init_extra_minSpeed, _init_maxRadius, _init_extra_maxRadius, _init_minRadius, _init_extra_minRadius, _init_valid, _init_extra_valid;

/** Generates particle position and velocity offsets sampled within a rotated spherical cone and radius range. */
let _Tr2SphereShapeAttrib;
new class extends _identity {
  static [class Tr2SphereShapeAttributeGenerator extends CjsModel {
    static {
      ({
        e: [_init_minPhi, _init_extra_minPhi, _init_maxPhi, _init_extra_maxPhi, _init_minTheta, _init_extra_minTheta, _init_maxTheta, _init_extra_maxTheta, _init_distributionExponent, _init_extra_distributionExponent, _init_controlPosition, _init_extra_controlPosition, _init_controlVelocity, _init_extra_controlVelocity, _init_rotation, _init_extra_rotation, _init_position, _init_extra_position, _init_parentVelocityFactor, _init_extra_parentVelocityFactor, _init_maxSpeed, _init_extra_maxSpeed, _init_minSpeed, _init_extra_minSpeed, _init_maxRadius, _init_extra_maxRadius, _init_minRadius, _init_extra_minRadius, _init_valid, _init_extra_valid, _initProto],
        c: [_Tr2SphereShapeAttrib, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2SphereShapeAttributeGenerator",
        family: "particle"
      })], [[[io, io.persist, type, type.float32], 16, "minPhi"], [[io, io.persist, type, type.float32], 16, "maxPhi"], [[io, io.persist, type, type.float32], 16, "minTheta"], [[io, io.persist, type, type.float32], 16, "maxTheta"], [[io, io.persist, type, type.float32], 16, "distributionExponent"], [[io, io.persist, type, type.boolean], 16, "controlPosition"], [[io, io.persist, type, type.boolean], 16, "controlVelocity"], [[io, io.persist, type, type.quat], 16, "rotation"], [[io, io.persist, type, type.vec3], 16, "position"], [[io, io.persist, type, type.float32], 16, "parentVelocityFactor"], [[io, io.persist, type, type.float32], 16, "maxSpeed"], [[io, io.persist, type, type.float32], 16, "minSpeed"], [[io, io.persist, type, type.float32], 16, "maxRadius"], [[io, io.persist, type, type.float32], 16, "minRadius"], [[io, io.read, type, type.boolean], 16, "valid"], [[impl, impl.implemented], 18, "Bind"], [[impl, impl.adapted, void 0, impl.reason("Carbon's particle RNG is replaced by Math.random while retaining its cone sampling, rotation and distribution-exponent order.")], 18, "Generate"], [[impl, impl.implemented], 18, "GetName"], [[impl, impl.adapted, void 0, impl.reason("Carbon's paired reference outputs become caller-provided out arguments.")], 18, "GetTransform"], [[impl, impl.implemented], 18, "SetTransform"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_valid(this);
    }
    #positionElement = (_initProto(this), null);
    #velocityElement = null;

    /** m_minPhi (float) [READWRITE, PERSIST] */
    minPhi = _init_minPhi(this, 0);

    /** m_maxPhi (float) [READWRITE, PERSIST] */
    maxPhi = (_init_extra_minPhi(this), _init_maxPhi(this, 360));

    /** m_minTheta (float) [READWRITE, PERSIST] */
    minTheta = (_init_extra_maxPhi(this), _init_minTheta(this, 0));

    /** m_maxTheta (float) [READWRITE, PERSIST] */
    maxTheta = (_init_extra_minTheta(this), _init_maxTheta(this, 360));

    /** m_distributionExponent (float) [READWRITE, PERSIST] */
    distributionExponent = (_init_extra_maxTheta(this), _init_distributionExponent(this, 1));

    /** m_controlPosition (bool) [READWRITE, PERSIST] */
    controlPosition = (_init_extra_distributionExponent(this), _init_controlPosition(this, true));

    /** m_controlVelocity (bool) [READWRITE, PERSIST] */
    controlVelocity = (_init_extra_controlPosition(this), _init_controlVelocity(this, true));

    /** m_rotation (Quaternion) [READWRITE, PERSIST] */
    rotation = (_init_extra_controlVelocity(this), _init_rotation(this, quat.create()));

    /** m_position (Vector3) [READWRITE, PERSIST] */
    position = (_init_extra_rotation(this), _init_position(this, vec3.create()));

    /** m_parentVelocityFactor (float) [READWRITE, PERSIST] */
    parentVelocityFactor = (_init_extra_position(this), _init_parentVelocityFactor(this, 1));

    /** m_maxSpeed (float) [READWRITE, PERSIST] */
    maxSpeed = (_init_extra_parentVelocityFactor(this), _init_maxSpeed(this, 0));

    /** m_minSpeed (float) [READWRITE, PERSIST] */
    minSpeed = (_init_extra_maxSpeed(this), _init_minSpeed(this, 0));

    /** m_maxRadius (float) [READWRITE, PERSIST] */
    maxRadius = (_init_extra_minSpeed(this), _init_maxRadius(this, 0));

    /** m_minRadius (float) [READWRITE, PERSIST] */
    minRadius = (_init_extra_maxRadius(this), _init_minRadius(this, 0));

    /** m_valid (bool) [READ] */
    valid = (_init_extra_minRadius(this), _init_valid(this, false));

    /**
     * Resolves the position and velocity elements according to the control flags, marking the generator valid only when every required element resolves.
     */
    Bind(particleSystem, boundElements) {
      this.#positionElement = this.controlPosition ? bindParticleElement(particleSystem, _Tr2ParticleElementDe.Type.POSITION, boundElements) : null;
      this.#velocityElement = this.controlVelocity ? bindParticleElement(particleSystem, _Tr2ParticleElementDe.Type.VELOCITY, boundElements) : null;
      this.valid = (!this.controlPosition || !!this.#positionElement) && (!this.controlVelocity || !!this.#velocityElement);
      return this.valid;
    }

    /**
     * Samples a direction within the configured cone and radius range to write one particle's position and velocity offset.
     */
    Generate(parentPosition, parentVelocity, index) {
      if (!this.valid || !this.controlPosition && !this.controlVelocity) {
        return;
      }
      const phi = (this.minPhi + Math.random() * (this.maxPhi - this.minPhi)) * Math.PI / 180;
      const theta = (this.minTheta + Math.random() * (this.maxTheta - this.minTheta)) * Math.PI / 180;
      const direction = _Tr2SphereShapeAttrib.#direction;
      vec3.set(direction, Math.sin(phi) * Math.cos(theta), -Math.cos(phi), Math.sin(phi) * Math.sin(theta));
      // Carbon's XMQuaternionMultiply(XMQuaternionMultiply(conj(q), v), q)
      // (Tr2SphereShapeAttributeGenerator.cpp:87-89) is the standard active
      // rotation q * v * q^-1 - exactly vec3.transformQuat.
      vec3.transformQuat(direction, direction, this.rotation);
      if (this.#velocityElement) {
        const speed = this.minSpeed + Math.random() * (this.maxSpeed - this.minSpeed);
        const offset = this.#velocityElement.startOffset + index * this.#velocityElement.instanceStride;
        for (let component = 0; component < 3; component++) {
          this.#velocityElement.buffer[offset + component] = direction[component] * speed + (parentVelocity?.[component] ?? 0) * this.parentVelocityFactor;
        }
      }
      if (this.#positionElement) {
        // frand(min, max, exponent) = min + (max - min) * pow(rand, exponent)
        // (Tr2SphereShapeAttributeGenerator.cpp:21-24).
        const radius = this.minRadius + (this.maxRadius - this.minRadius) * Math.pow(Math.random(), this.distributionExponent);
        const offset = this.#positionElement.startOffset + index * this.#positionElement.instanceStride;
        for (let component = 0; component < 3; component++) {
          this.#positionElement.buffer[offset + component] = direction[component] * radius + this.position[component] + (parentPosition?.[component] ?? 0);
        }
      }
    }

    /**
     * A label saying whether the generator controls position, velocity, both, or neither.
     */
    GetName() {
      return this.controlPosition ? this.controlVelocity ? "POSITION + VELOCITY" : "POSITION" : this.controlVelocity ? "VELOCITY" : "NONE";
    }

    /** Carbon returns via reference arguments (Tr2SphereShapeAttributeGenerator.cpp:215-219). */
    GetTransform(outPosition, outRotation) {
      vec3.copy(outPosition, this.position);
      quat.copy(outRotation, this.rotation);
    }

    /**
     * Copies the given position and rotation into the generator's transform.
     */
    SetTransform(position, rotation) {
      vec3.copy(this.position, position);
      quat.copy(this.rotation, rotation);
    }
  }];
  #direction = vec3.create();
  constructor() {
    super(_Tr2SphereShapeAttrib), _initClass();
  }
}();

export { _Tr2SphereShapeAttrib as Tr2SphereShapeAttributeGenerator };
//# sourceMappingURL=Tr2SphereShapeAttributeGenerator.js.map
