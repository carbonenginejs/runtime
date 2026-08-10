import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { ProcessPriority } from './enums.js';

let _initProto, _initClass, _init_behaviorPriority, _init_extra_behaviorPriority, _init_inclusionVolumes, _init_extra_inclusionVolumes, _init_behaviorWeight, _init_extra_behaviorWeight, _init_enabled, _init_extra_enabled, _init_framesBetweenUpdates, _init_extra_framesBetweenUpdates;

// Module scratch for the per-agent loop (behavior updates run sequentially).
const FORCE = vec3.create();
const NORMALIZED_FORCE = vec3.create();
const FORCE_OFFSET = vec3.create();
const NO_FORCES = [];

/**
 * Drone behavior that pulls agents back toward the inclusion volumes once they
 * drift into the falloff shell; agents fully inside feel no force.
 */
let _InclusionVolume;
new class extends _identity {
  static [class InclusionVolume extends CjsModel {
    static {
      ({
        e: [_init_behaviorPriority, _init_extra_behaviorPriority, _init_inclusionVolumes, _init_extra_inclusionVolumes, _init_behaviorWeight, _init_extra_behaviorWeight, _init_enabled, _init_extra_enabled, _init_framesBetweenUpdates, _init_extra_framesBetweenUpdates, _initProto],
        c: [_InclusionVolume, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "InclusionVolume",
        family: "eve/child/behaviors"
      })], [[[io, io.notify, io, io.persist, type, type.int32, void 0, type.enum("ProcessPriority")], 16, "behaviorPriority"], [[io, io.persist, void 0, type.list("IEveVolume")], 16, "inclusionVolumes"], [[io, io.persist, type, type.float32], 16, "behaviorWeight"], [[io, io.persist, type, type.boolean], 16, "enabled"], [[io, io.persist, type, type.int32], 16, "framesBetweenUpdates"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetProcessPriority"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon pushes a debug force pair for every agent unconditionally; the JS port collects them only when group.collectForces is set to keep the per-agent loop allocation-free.")], 18, "CalculateBehavior"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Tr2DebugRendererOptions is represented by an injected Set-like option bag.")], 18, "GetDebugOptions"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("ITr2DebugRenderer2 is an injected engine-owned capability.")], 18, "RenderDebugInfo"]], 0, void 0, CjsModel));
    }
    /** m_priority (int32_t) [READWRITE, PERSIST, NOTIFY, ENUM] */
    behaviorPriority = (_initProto(this), _init_behaviorPriority(this, 0));

    /** m_inclusionVolumes (PIEveVolumeVector) [READ, PERSIST] */
    inclusionVolumes = (_init_extra_behaviorPriority(this), _init_inclusionVolumes(this, []));

    /** m_behaviorWeight (float) [READWRITE, PERSIST] */
    behaviorWeight = (_init_extra_inclusionVolumes(this), _init_behaviorWeight(this, 60));

    /** m_enabled (bool) [READWRITE, PERSIST] */
    enabled = (_init_extra_behaviorWeight(this), _init_enabled(this, true));

    /** m_framesBetweenUpdates (int32_t) [READWRITE, PERSIST] */
    framesBetweenUpdates = (_init_extra_enabled(this), _init_framesBetweenUpdates(this, 11));

    // Per-frame cache of the inclusion volume centres, prefetched so the
    // per-agent loop stays allocation-free.
    #volumeCenters = (_init_extra_framesBetweenUpdates(this), []);
    #returnForces = [];

    /** Carbon InclusionVolume::GetProcessPriority (cpp:21-24). */
    GetProcessPriority() {
      return this.behaviorPriority;
    }

    /**
     * Pulls each agent back toward the inclusion volumes when it drifts into
     * their falloff shell; fully-inside agents feel no force (Carbon
     * CalculateBehavior, cpp:26-69).
     * @param {Array} agents - DroneAgent records
     * @param {Array|null} _scratchData - unused (no scratch)
     * @param {Number} _deltaTime
     * @param {Object} group - owning BehaviorGroup
     * @param {Object} _system - owning EveChildBehaviorSystem
     * @param {Array} _dronesInSearchRadius - unused
     * @returns {Array} debug force pairs when group.collectForces is on
     */
    CalculateBehavior(agents, _scratchData, _deltaTime, group, _system, _dronesInSearchRadius) {
      if (!this.enabled) {
        return NO_FORCES;
      }
      const returnForces = this.#returnForces;
      returnForces.length = 0;
      const centers = this.#volumeCenters;
      centers.length = 0;
      for (const volume of this.inclusionVolumes) {
        centers.push(volume?.GetBoundingSphere?.()?.center ?? null);
      }
      for (const agent of agents) {
        vec3.set(FORCE, 0, 0, 0);
        vec3.set(NORMALIZED_FORCE, 0, 0, 0);
        for (let i = 0; i < this.inclusionVolumes.length; i++) {
          const status = Number(this.inclusionVolumes[i]?.GetIntensity?.(agent.position) ?? 0);
          if (status === 1) {
            vec3.set(FORCE, 0, 0, 0);
            vec3.set(NORMALIZED_FORCE, 0, 0, 0);
            break;
          } else if (status > 0 && centers[i]) {
            vec3.subtract(NORMALIZED_FORCE, centers[i], agent.position);
            vec3.normalize(NORMALIZED_FORCE, NORMALIZED_FORCE);
            vec3.scale(FORCE, NORMALIZED_FORCE, this.behaviorWeight);
          }
        }
        vec3.add(agent.acceleration, agent.acceleration, FORCE);
        if (group.collectForces) {
          vec3.scale(FORCE_OFFSET, NORMALIZED_FORCE, group.GetBoundingSphereRadius());
          returnForces.push(vec3.add(vec3.create(), agent.position, FORCE_OFFSET));
          returnForces.push(vec3.clone(FORCE));
        }
      }
      return returnForces;
    }

    /** Adds Carbon's inclusion-volume debug option. */
    GetDebugOptions(options = new Set()) {
      if (options?.add) {
        options.add("InclusionVolumes");
      } else {
        options?.insert?.("InclusionVolumes");
      }
      return options;
    }

    /** Delegates inclusion-volume debug geometry when its option is enabled. */
    RenderDebugInfo(renderer, _agents, parentWorldLocation) {
      if (!renderer?.HasOption?.(this, "InclusionVolumes")) {
        return;
      }
      for (const volume of this.inclusionVolumes) {
        volume?.RenderDebugInfo?.(renderer, parentWorldLocation);
      }
    }
  }];
  ProcessPriority = ProcessPriority;
  constructor() {
    super(_InclusionVolume), _initClass();
  }
}();

export { _InclusionVolume as InclusionVolume };
//# sourceMappingURL=InclusionVolume.js.map
