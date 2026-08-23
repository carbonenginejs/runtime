import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

let _initProto, _initClass, _init_behaviorPriority, _init_extra_behaviorPriority, _init_minInertiaWeight, _init_extra_minInertiaWeight, _init_maxRotationSpeed, _init_extra_maxRotationSpeed, _init_maxAcceleration, _init_extra_maxAcceleration, _init_enabled, _init_extra_enabled;

// Module scratch for the per-agent loop (behavior updates run sequentially).
const LAST_ACCEL_NORMALIZED = vec3.create();
const ACCEL_NORMALIZED = vec3.create();
const ROTATION_AXIS = vec3.create();
const ROTATION_QUAT = quat.create();
const NO_FORCES = [];

// Carbon ClampLength: in-place clamp of a vec3 to a maximum length.
function ClampLength(value, maxLength) {
  const lengthSq = vec3.squaredLength(value);
  if (lengthSq > maxLength * maxLength && lengthSq > 0) {
    vec3.scale(value, value, maxLength / Math.sqrt(lengthSq));
  }
  return value;
}

/** A steering behaviour that smooths each agent's acceleration by rotating it toward the previous frame's direction at a limited angular speed and blending its magnitude toward the desired value. */
let _Inertia;
class Inertia extends CjsModel {
  static {
    ({
      e: [_init_behaviorPriority, _init_extra_behaviorPriority, _init_minInertiaWeight, _init_extra_minInertiaWeight, _init_maxRotationSpeed, _init_extra_maxRotationSpeed, _init_maxAcceleration, _init_extra_maxAcceleration, _init_enabled, _init_extra_enabled, _initProto],
      c: [_Inertia, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Inertia",
      family: "eve/child/behaviors"
    })], [[[io, io.notify, io, io.persist, type, type.int32], 16, "behaviorPriority"], [[io, io.persist, type, type.float32], 16, "minInertiaWeight"], [[io, io.persist, type, type.float32], 16, "maxRotationSpeed"], [[io, io.persist, type, type.float32], 16, "maxAcceleration"], [[io, io.persist, type, type.boolean], 16, "enabled"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetProcessPriority"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon returns a byte size; the JS port models scratch as one plain record per agent, so any non-zero value means 'has scratch'.")], 18, "GetScratchMemorySize"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon initializes caller-provided raw memory; the JS port returns the fresh record instead.")], 18, "InitializeScratch"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon pushes the adjusted acceleration into the debug vector unconditionally; the JS port collects it only when group.collectForces is set to keep the per-agent loop allocation-free.")], 18, "CalculateBehavior"]], 0, void 0, CjsModel));
  }
  /** m_priority (int32_t) [READWRITE, PERSIST, NOTIFY, ENUM] */
  behaviorPriority = (_initProto(this), _init_behaviorPriority(this, 0));

  /** m_minInertiaWeight (float) [READWRITE, PERSIST] */
  minInertiaWeight = (_init_extra_behaviorPriority(this), _init_minInertiaWeight(this, 0.1));

  /** m_maxRotationSpeed (float) [READWRITE, PERSIST] */
  maxRotationSpeed = (_init_extra_minInertiaWeight(this), _init_maxRotationSpeed(this, 3.14));

  /** m_maxAcceleration (float) [READWRITE, PERSIST] */
  maxAcceleration = (_init_extra_maxRotationSpeed(this), _init_maxAcceleration(this, 60));

  /** m_enabled (bool) [READWRITE, PERSIST] */
  enabled = (_init_extra_maxAcceleration(this), _init_enabled(this, true));
  #returnForces = (_init_extra_enabled(this), []);

  /** Carbon Inertia::GetProcessPriority (cpp:20-23). */
  GetProcessPriority() {
    return this.behaviorPriority;
  }

  /** Per-agent scratch record count (Carbon sizeof(InertiaData)). */
  GetScratchMemorySize() {
    return 1;
  }

  /** Fresh per-agent scratch record (Carbon InertiaData placement init). */
  InitializeScratch() {
    return {
      agentAccel: vec3.create(),
      inertiaWeight: 0
    };
  }

  /**
   * Turns the accumulated acceleration toward last frame's direction at a
   * limited angular speed and blends its magnitude by the agent's remaining
   * headroom (Carbon CalculateBehavior, cpp:35-82).
   * @param {Array} agents - DroneAgent records
   * @param {Array} scratchData - per-agent InertiaData records
   * @param {Number} deltaTime
   * @param {Object} group - owning BehaviorGroup
   * @param {Object} _system - owning EveChildBehaviorSystem
   * @param {Array} _dronesInSearchRadius - unused
   * @returns {Array} debug forces when group.collectForces is on
   */
  CalculateBehavior(agents, scratchData, deltaTime, group, _system, _dronesInSearchRadius) {
    if (!this.enabled) {
      return NO_FORCES;
    }
    const returnForces = this.#returnForces;
    returnForces.length = 0;
    for (let c = 0; c < agents.length; c++) {
      const agent = agents[c];
      const data = scratchData?.[c];
      if (!data) {
        continue;
      }
      vec3.normalize(LAST_ACCEL_NORMALIZED, data.agentAccel);
      const lastAccelLength = vec3.length(data.agentAccel);
      vec3.normalize(ACCEL_NORMALIZED, agent.acceleration);
      const accelLength = vec3.length(agent.acceleration);
      if (vec3.squaredLength(LAST_ACCEL_NORMALIZED) !== 0 && this.maxRotationSpeed > 0) {
        vec3.cross(ROTATION_AXIS, LAST_ACCEL_NORMALIZED, ACCEL_NORMALIZED);
        vec3.normalize(ROTATION_AXIS, ROTATION_AXIS);
        if (vec3.length(ROTATION_AXIS) === 0) {
          vec3.set(ROTATION_AXIS, 0, 1, 0);
        }
        let angle = vec3.angle(LAST_ACCEL_NORMALIZED, ACCEL_NORMALIZED);
        const step = this.maxRotationSpeed * deltaTime;
        angle = Math.min(angle, step);
        if (angle > 0) {
          quat.setAxisAngle(ROTATION_QUAT, ROTATION_AXIS, angle);
          // Carbon rotates last frame's unit acceleration into the agent's
          // acceleration (TriVectorRotateQuaternion, cpp:65-67).
          vec3.transformQuat(agent.acceleration, LAST_ACCEL_NORMALIZED, ROTATION_QUAT);
        }
        const agentVelocityLength = vec3.length(agent.velocity);
        data.inertiaWeight = group.GetMaxVelocity() - agentVelocityLength;
        data.inertiaWeight = Math.min(Math.max(data.inertiaWeight, 0.1), group.GetMaxVelocity());
        const blended = lastAccelLength + (accelLength - lastAccelLength) * (data.inertiaWeight * deltaTime);
        vec3.normalize(agent.acceleration, agent.acceleration);
        vec3.scale(agent.acceleration, agent.acceleration, blended);
        ClampLength(agent.acceleration, this.maxAcceleration);
        if (group.collectForces) {
          returnForces.push(vec3.clone(agent.acceleration));
        }
      }
      vec3.copy(data.agentAccel, agent.acceleration);
    }
    return returnForces;
  }
  static {
    _initClass();
  }
}

export { _Inertia as Inertia };
//# sourceMappingURL=Inertia.js.map
