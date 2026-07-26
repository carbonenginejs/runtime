import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl, schema } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { ProcessPriority } from './enums.js';

let _initProto, _initClass, _init_behaviorPriority, _init_extra_behaviorPriority, _init_exclusionVolumes, _init_extra_exclusionVolumes, _init_avoidanceScalar, _init_extra_avoidanceScalar, _init_enabled, _init_extra_enabled;

// Module scratch for the per-agent loop (behavior updates run sequentially).
const FROM_TARGET = vec3.create();
const NO_FORCES = [];

/**
 * Drone behavior that pushes agents away from the centre of every exclusion
 * volume they intersect, weighted by the volume's intensity at the agent.
 */
let _CollisionAvoidance;
new class extends _identity {
  static [class CollisionAvoidance extends CjsModel {
    static {
      ({
        e: [_init_behaviorPriority, _init_extra_behaviorPriority, _init_exclusionVolumes, _init_extra_exclusionVolumes, _init_avoidanceScalar, _init_extra_avoidanceScalar, _init_enabled, _init_extra_enabled, _initProto],
        c: [_CollisionAvoidance, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "CollisionAvoidance",
        family: "eve/child/behaviors"
      })], [[[io, io.notify, io, io.persist, type, type.int32, void 0, schema.enum("ProcessPriority")], 16, "behaviorPriority"], [[io, io.persist, void 0, type.list("IEveVolume")], 16, "exclusionVolumes"], [[io, io.persist, type, type.float32], 16, "avoidanceScalar"], [[io, io.persist, type, type.boolean], 16, "enabled"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetProcessPriority"], [[carbon, carbon.method, impl, impl.implemented], 18, "CalculateBehavior"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Tr2DebugRendererOptions is represented by an injected Set-like option bag.")], 18, "GetDebugOptions"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("ITr2DebugRenderer2 is an injected engine-owned capability.")], 18, "RenderDebugInfo"]], 0, void 0, CjsModel));
    }
    /** m_priority (int32_t) [READWRITE, PERSIST, NOTIFY, ENUM] */
    behaviorPriority = (_initProto(this), _init_behaviorPriority(this, 0));

    /** m_exclusionVolumes (PIEveVolumeVector) [READ, PERSIST] */
    exclusionVolumes = (_init_extra_behaviorPriority(this), _init_exclusionVolumes(this, []));

    /** m_collisionAvoidanceScalar (float) [READWRITE, PERSIST] */
    avoidanceScalar = (_init_extra_exclusionVolumes(this), _init_avoidanceScalar(this, 12));

    /** m_enabled (bool) [READWRITE, PERSIST] */
    enabled = (_init_extra_avoidanceScalar(this), _init_enabled(this, true));

    // Per-frame cache of the exclusion volume centres, prefetched so the
    // per-agent loop stays allocation-free.
    #volumeCenters = (_init_extra_enabled(this), []);

    /** Carbon CollisionAvoidance::GetProcessPriority (cpp:18-21). */
    GetProcessPriority() {
      return this.behaviorPriority;
    }

    /**
     * Pushes each agent out of every exclusion volume it intersects,
     * intensity-weighted away from the volume centre (Carbon CalculateBehavior,
     * cpp:23-49). Carbon returns an always-empty force vector here.
     * @param {Array} agents - DroneAgent records
     * @param {Array|null} _scratchData - unused (no scratch)
     * @param {Number} _deltaTime
     * @param {Object} _group - owning BehaviorGroup
     * @param {Object} _system - owning EveChildBehaviorSystem
     * @param {Array} _dronesInSearchRadius - unused
     * @returns {Array} empty (as Carbon)
     */
    CalculateBehavior(agents, _scratchData, _deltaTime, _group, _system, _dronesInSearchRadius) {
      if (!this.enabled) {
        return NO_FORCES;
      }
      const centers = this.#volumeCenters;
      centers.length = 0;
      for (const volume of this.exclusionVolumes) {
        centers.push(volume?.GetBoundingSphere?.()?.center ?? null);
      }
      for (const agent of agents) {
        for (let i = 0; i < this.exclusionVolumes.length; i++) {
          const intensity = Number(this.exclusionVolumes[i]?.GetIntensity?.(agent.position) ?? 0);
          // we only want to continue if we are inside the outer radius
          if (intensity > 0 && centers[i]) {
            // get the direction AWAY from the center of the exclusion volume
            vec3.subtract(FROM_TARGET, agent.position, centers[i]);
            vec3.scaleAndAdd(agent.acceleration, agent.acceleration, FROM_TARGET, intensity * this.avoidanceScalar);
          }
        }
      }
      return NO_FORCES;
    }

    /** Adds Carbon's exclusion-volume debug option. */
    GetDebugOptions(options = new Set()) {
      if (options?.add) {
        options.add("ExclusionVolumes");
      } else {
        options?.insert?.("ExclusionVolumes");
      }
      return options;
    }

    /** Delegates exclusion-volume debug geometry when its option is enabled. */
    RenderDebugInfo(renderer, _agents, parentWorldLocation) {
      if (!renderer?.HasOption?.(this, "ExclusionVolumes")) {
        return;
      }
      for (const volume of this.exclusionVolumes) {
        volume?.RenderDebugInfo?.(renderer, parentWorldLocation);
      }
    }
  }];
  ProcessPriority = ProcessPriority;
  constructor() {
    super(_CollisionAvoidance), _initClass();
  }
}();

export { _CollisionAvoidance as CollisionAvoidance };
//# sourceMappingURL=CollisionAvoidance.js.map
