import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { bindParticleElement } from './particleElementBinding.js';
import { Tr2ParticleElementDeclaration as _Tr2ParticleElementDe } from './Tr2ParticleElementDeclaration.js';

let _initProto, _initClass, _init_minPhi, _init_extra_minPhi, _init_maxPhi, _init_extra_maxPhi, _init_minTheta, _init_extra_minTheta, _init_maxTheta, _init_extra_maxTheta, _init_controlVelocity, _init_extra_controlVelocity, _init_positionEnd, _init_extra_positionEnd, _init_rotationStart, _init_extra_rotationStart, _init_rotationEnd, _init_extra_rotationEnd, _init_positionStart, _init_extra_positionStart, _init_parentVelocityFactor, _init_extra_parentVelocityFactor, _init_maxSpeed, _init_extra_maxSpeed, _init_minSpeed, _init_extra_minSpeed, _init_maxRadius, _init_extra_maxRadius, _init_minRadius, _init_extra_minRadius, _init_valid, _init_extra_valid;

/** Generates particle position and velocity offsets sampled within a capsule volume interpolated between a start and end transform. */
let _Tr2CapsuleShapeAttri;
new class extends _identity {
  static [class Tr2CapsuleShapeAttributeGenerator extends CjsModel {
    static {
      ({
        e: [_init_minPhi, _init_extra_minPhi, _init_maxPhi, _init_extra_maxPhi, _init_minTheta, _init_extra_minTheta, _init_maxTheta, _init_extra_maxTheta, _init_controlVelocity, _init_extra_controlVelocity, _init_positionEnd, _init_extra_positionEnd, _init_rotationStart, _init_extra_rotationStart, _init_rotationEnd, _init_extra_rotationEnd, _init_positionStart, _init_extra_positionStart, _init_parentVelocityFactor, _init_extra_parentVelocityFactor, _init_maxSpeed, _init_extra_maxSpeed, _init_minSpeed, _init_extra_minSpeed, _init_maxRadius, _init_extra_maxRadius, _init_minRadius, _init_extra_minRadius, _init_valid, _init_extra_valid, _initProto],
        c: [_Tr2CapsuleShapeAttri, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2CapsuleShapeAttributeGenerator",
        family: "particle"
      })], [[[io, io.persist, type, type.float32], 16, "minPhi"], [[io, io.persist, type, type.float32], 16, "maxPhi"], [[io, io.persist, type, type.float32], 16, "minTheta"], [[io, io.persist, type, type.float32], 16, "maxTheta"], [[io, io.persist, type, type.boolean], 16, "controlVelocity"], [[io, io.persist, type, type.vec3], 16, "positionEnd"], [[io, io.persist, type, type.quat], 16, "rotationStart"], [[io, io.persist, type, type.quat], 16, "rotationEnd"], [[io, io.persist, type, type.vec3], 16, "positionStart"], [[io, io.persist, type, type.float32], 16, "parentVelocityFactor"], [[io, io.persist, type, type.float32], 16, "maxSpeed"], [[io, io.persist, type, type.float32], 16, "minSpeed"], [[io, io.persist, type, type.float32], 16, "maxRadius"], [[io, io.persist, type, type.float32], 16, "minRadius"], [[io, io.read, type, type.boolean], 16, "valid"], [[impl, impl.implemented], 18, "Bind"], [[impl, impl.adapted, void 0, impl.reason("Carbon's particle RNG is replaced by Math.random while retaining its capsule sampling and interpolation order.")], 18, "Generate"], [[impl, impl.implemented], 18, "GetName"], [[impl, impl.implemented], 18, "SetPositions"]], 0, void 0, CjsModel));
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

    /** m_controlVelocity (bool) [READWRITE, PERSIST] */
    controlVelocity = (_init_extra_maxTheta(this), _init_controlVelocity(this, true));

    /** m_positionEnd (Vector3) [READWRITE, PERSIST] */
    positionEnd = (_init_extra_controlVelocity(this), _init_positionEnd(this, vec3.create()));

    /** m_rotationStart (Quaternion) [READWRITE, PERSIST] */
    rotationStart = (_init_extra_positionEnd(this), _init_rotationStart(this, quat.create()));

    /** m_rotationEnd (Quaternion) [READWRITE, PERSIST] */
    rotationEnd = (_init_extra_rotationStart(this), _init_rotationEnd(this, quat.create()));

    /** m_positionStart (Vector3) [READWRITE, PERSIST] */
    positionStart = (_init_extra_rotationEnd(this), _init_positionStart(this, vec3.create()));

    /** m_parentVelocityFactor (float) [READWRITE, PERSIST] */
    parentVelocityFactor = (_init_extra_positionStart(this), _init_parentVelocityFactor(this, 1));

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
     * Resolves the position element, and the velocity element when velocity control is enabled, marking the generator valid only when both required elements resolve.
     */
    Bind(particleSystem, boundElements) {
      this.#positionElement = bindParticleElement(particleSystem, _Tr2ParticleElementDe.Type.POSITION, boundElements);
      this.#velocityElement = this.controlVelocity ? bindParticleElement(particleSystem, _Tr2ParticleElementDe.Type.VELOCITY, boundElements) : null;
      this.valid = !!this.#positionElement && (!this.controlVelocity || !!this.#velocityElement);
      return this.valid;
    }

    /**
     * Samples a random cone direction and capsule interpolation point to write one particle's velocity and position offset from the parent transform.
     */
    Generate(parentPosition, parentVelocity, index) {
      if (!this.valid) {
        return;
      }
      const phi = (this.minPhi + Math.random() * (this.maxPhi - this.minPhi)) * Math.PI / 180;
      const theta = (this.minTheta + Math.random() * (this.maxTheta - this.minTheta)) * Math.PI / 180;
      const direction = _Tr2CapsuleShapeAttri.#direction;
      vec3.set(direction, Math.sin(phi) * Math.cos(theta), -Math.cos(phi), Math.sin(phi) * Math.sin(theta));
      const amount = Math.random();
      const rotation = quat.slerp(_Tr2CapsuleShapeAttri.#rotation, this.rotationStart, this.rotationEnd, amount);
      vec3.transformQuat(direction, direction, rotation);
      if (this.#velocityElement) {
        const speed = this.minSpeed + Math.random() * (this.maxSpeed - this.minSpeed);
        const offset = this.#velocityElement.startOffset + index * this.#velocityElement.instanceStride;
        for (let component = 0; component < 3; component++) {
          this.#velocityElement.buffer[offset + component] = direction[component] * speed + (parentVelocity?.[component] ?? 0) * this.parentVelocityFactor;
        }
      }
      const radius = this.minRadius + Math.random() * (this.maxRadius - this.minRadius);
      const position = vec3.lerp(_Tr2CapsuleShapeAttri.#position, this.positionStart, this.positionEnd, amount);
      const offset = this.#positionElement.startOffset + index * this.#positionElement.instanceStride;
      for (let component = 0; component < 3; component++) {
        this.#positionElement.buffer[offset + component] = direction[component] * radius + position[component] + (parentPosition?.[component] ?? 0);
      }
    }

    /**
     * A label saying whether the generator controls position only, or position and velocity.
     */
    GetName() {
      return this.controlVelocity ? "POSITION + VELOCITY" : "POSITION";
    }

    /**
     * Copies the given start and end positions and rotations into the capsule endpoints.
     */
    SetPositions(startPosition, startRotation, endPosition, endRotation) {
      vec3.copy(this.positionStart, startPosition);
      quat.copy(this.rotationStart, startRotation);
      vec3.copy(this.positionEnd, endPosition);
      quat.copy(this.rotationEnd, endRotation);
    }
  }];
  #direction = vec3.create();
  #rotation = quat.create();
  #position = vec3.create();
  constructor() {
    super(_Tr2CapsuleShapeAttri), _initClass();
  }
}();

export { _Tr2CapsuleShapeAttri as Tr2CapsuleShapeAttributeGenerator };
//# sourceMappingURL=Tr2CapsuleShapeAttributeGenerator.js.map
