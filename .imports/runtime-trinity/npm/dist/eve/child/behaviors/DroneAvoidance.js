import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

let _initProto, _initClass, _init_behaviorPriority, _init_extra_behaviorPriority, _init_behaviorWeight, _init_extra_behaviorWeight, _init_visionRange, _init_extra_visionRange, _init_enabled, _init_extra_enabled, _init_framesBetweenUpdates, _init_extra_framesBetweenUpdates;

// Module scratch for the per-agent loop (behavior updates run sequentially).
const AVOIDANCE_DIRECTION = vec3.create();
const VELOCITY_NORMALIZED = vec3.create();
const FORCE_OFFSET = vec3.create();
const NO_FORCES = [];

/** A steering behaviour that pushes each drone away from its nearby neighbours, blended with its current velocity direction, to keep agents from clustering or overlapping. */
let _DroneAvoidance;
class DroneAvoidance extends CjsModel {
  static {
    ({
      e: [_init_behaviorPriority, _init_extra_behaviorPriority, _init_behaviorWeight, _init_extra_behaviorWeight, _init_visionRange, _init_extra_visionRange, _init_enabled, _init_extra_enabled, _init_framesBetweenUpdates, _init_extra_framesBetweenUpdates, _initProto],
      c: [_DroneAvoidance, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "DroneAvoidance",
      family: "eve/child/behaviors"
    })], [[[io, io.notify, io, io.persist, type, type.int32], 16, "behaviorPriority"], [[io, io.persist, type, type.float32], 16, "behaviorWeight"], [[io, io.persist, type, type.float32], 16, "visionRange"], [[io, io.persist, type, type.boolean], 16, "enabled"], [[io, io.persist, type, type.int32], 16, "framesBetweenUpdates"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetProcessPriority"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Debug force pairs are only collected when group.collectForces is set, keeping the per-agent loop allocation-free.")], 18, "CalculateBehavior"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetBehaviorSearchRadius"]], 0, void 0, CjsModel));
  }
  /** m_priority (int32_t) [READWRITE, PERSIST, NOTIFY, ENUM] */
  behaviorPriority = (_initProto(this), _init_behaviorPriority(this, 0));

  /** m_behaviorWeight (float) [READWRITE, PERSIST] */
  behaviorWeight = (_init_extra_behaviorPriority(this), _init_behaviorWeight(this, 300));

  /** m_visionRange (float) [READWRITE, PERSIST] */
  visionRange = (_init_extra_behaviorWeight(this), _init_visionRange(this, 5));

  /** m_enabled (bool) [READWRITE, PERSIST] */
  enabled = (_init_extra_visionRange(this), _init_enabled(this, true));

  /** m_framesBetweenUpdates (int32_t) [READWRITE, PERSIST] */
  framesBetweenUpdates = (_init_extra_enabled(this), _init_framesBetweenUpdates(this, 3));

  // Carbon m_frameCounter/m_lastPullForces runtime state.
  #frameCounter = (_init_extra_framesBetweenUpdates(this), 0);
  #lastPullForces = [];
  #returnForces = [];

  /** Carbon DroneAvoidance::GetProcessPriority (cpp:22-25). */
  GetProcessPriority() {
    return this.behaviorPriority;
  }

  /**
   * Pushes each agent away from close neighbours, blended with its current
   * velocity direction, on refresh frames; replays the cached forces in
   * between (Carbon CalculateBehavior, cpp:27-130).
   * @param {Array} agents - DroneAgent records
   * @param {Array|null} _scratchData - unused (no scratch)
   * @param {Number} _deltaTime
   * @param {Object} group - owning BehaviorGroup
   * @param {Object} _system - owning EveChildBehaviorSystem
   * @param {Array} dronesInSearchRadius - per-agent neighbour lists
   * @returns {Array} debug force pairs when group.collectForces is on
   */
  CalculateBehavior(agents, _scratchData, _deltaTime, group, _system, dronesInSearchRadius) {
    if (!this.enabled) {
      return NO_FORCES;
    }
    const returnForces = this.#returnForces;
    returnForces.length = 0;
    if (this.#frameCounter === 0) {
      let c = 0;
      for (const agent of agents) {
        const pullForce = this.#PullForceAt(c);
        if (dronesInSearchRadius.length <= c) {
          vec3.set(pullForce, 0, 0, 0);
          c++;
          continue;
        }
        if (dronesInSearchRadius.length === 0) {
          vec3.set(pullForce, 0, 0, 0);
          this.#lastPullForces.length = c + 1;
          return returnForces;
        }
        const neighbours = dronesInSearchRadius[c];
        c++;
        if (neighbours.length === 0 || neighbours.length === 1) {
          vec3.set(pullForce, 0, 0, 0);
          continue;
        }
        vec3.set(AVOIDANCE_DIRECTION, 0, 0, 0);
        for (const other of neighbours) {
          if (other.id === agent.id) {
            continue;
          }
          AVOIDANCE_DIRECTION[0] += agent.position[0] - other.position[0];
          AVOIDANCE_DIRECTION[1] += agent.position[1] - other.position[1];
          AVOIDANCE_DIRECTION[2] += agent.position[2] - other.position[2];
        }
        if (vec3.squaredLength(AVOIDANCE_DIRECTION) === 0) {
          vec3.set(pullForce, 0, 0, 0);
          continue;
        }
        vec3.normalize(AVOIDANCE_DIRECTION, AVOIDANCE_DIRECTION);
        vec3.normalize(VELOCITY_NORMALIZED, agent.velocity);
        vec3.scale(pullForce, AVOIDANCE_DIRECTION, 0.5);
        vec3.scaleAndAdd(pullForce, pullForce, VELOCITY_NORMALIZED, 0.5);
        vec3.scale(pullForce, pullForce, this.behaviorWeight);
        if (vec3.squaredLength(pullForce) > 0) {
          vec3.add(agent.acceleration, agent.acceleration, pullForce);
        } else {
          vec3.set(pullForce, 0, 0, 0);
        }
        if (group.collectForces) {
          vec3.normalize(FORCE_OFFSET, pullForce);
          vec3.scale(FORCE_OFFSET, FORCE_OFFSET, group.GetBoundingSphereRadius());
          returnForces.push(vec3.add(vec3.create(), agent.position, FORCE_OFFSET));
          returnForces.push(vec3.clone(pullForce));
        }
      }
      this.#lastPullForces.length = c;
    } else {
      if (this.#lastPullForces.length === 0) {
        return returnForces;
      }
      let c = 0;
      for (const agent of agents) {
        if (c >= this.#lastPullForces.length) {
          break;
        }
        const pullForce = this.#lastPullForces[c];
        vec3.add(agent.acceleration, agent.acceleration, pullForce);
        if (group.collectForces && vec3.squaredLength(pullForce) > 0) {
          vec3.normalize(FORCE_OFFSET, pullForce);
          vec3.scale(FORCE_OFFSET, FORCE_OFFSET, group.GetBoundingSphereRadius());
          returnForces.push(vec3.add(vec3.create(), agent.position, FORCE_OFFSET));
          returnForces.push(vec3.clone(pullForce));
        }
        c++;
      }
    }
    return returnForces;
  }

  /** Carbon DroneAvoidance::GetBehaviorSearchRadius (cpp:132-144). */
  GetBehaviorSearchRadius() {
    if (this.#frameCounter >= this.framesBetweenUpdates) {
      this.#frameCounter = 0;
      return this.visionRange;
    }
    this.#frameCounter++;
    return -1;
  }

  // Reuses (or grows) the cached pull-force slot for one agent index.
  /**
   * The cached pull-force vector for an agent index, created on first use.
   */
  #PullForceAt(index) {
    let force = this.#lastPullForces[index];
    if (!force) {
      force = vec3.create();
      this.#lastPullForces[index] = force;
    }
    return force;
  }
  static {
    _initClass();
  }
}

export { _DroneAvoidance as DroneAvoidance };
//# sourceMappingURL=DroneAvoidance.js.map
