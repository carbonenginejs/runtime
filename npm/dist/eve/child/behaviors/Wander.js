import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl, schema } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { carbonPerlin1D } from '@carbonenginejs/runtime-utils/noise';
import { ProcessPriority } from './enums.js';

let _initProto, _initClass, _init_behaviorPriority, _init_extra_behaviorPriority, _init_rand, _init_extra_rand, _init_rand2, _init_extra_rand2, _init_rand3, _init_extra_rand3, _init_freq, _init_extra_freq, _init_weightWander, _init_extra_weightWander, _init_enabled, _init_extra_enabled;

// Module scratch for the per-agent loop (behavior updates run sequentially).
const FORCE = vec3.create();
const FORCE_OFFSET = vec3.create();
const NO_FORCES = [];

/**
 * Drone behavior that adds a per-agent Perlin-noise wander force seeded from the
 * agent's lifetime and id, so each drone drifts on its own path.
 */
let _Wander;
new class extends _identity {
  static [class Wander extends CjsModel {
    static {
      ({
        e: [_init_behaviorPriority, _init_extra_behaviorPriority, _init_rand, _init_extra_rand, _init_rand2, _init_extra_rand2, _init_rand3, _init_extra_rand3, _init_freq, _init_extra_freq, _init_weightWander, _init_extra_weightWander, _init_enabled, _init_extra_enabled, _initProto],
        c: [_Wander, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Wander",
        family: "eve/child/behaviors"
      })], [[[io, io.notify, io, io.persist, type, type.int32, void 0, schema.enum("ProcessPriority")], 16, "behaviorPriority"], [[io, io.persist, type, type.float32], 16, "rand1"], [[io, io.persist, type, type.float32], 16, "rand2"], [[io, io.persist, type, type.float32], 16, "rand3"], [[io, io.persist, type, type.float32], 16, "freq"], [[io, io.persist, type, type.float32], 16, "weightWander"], [[io, io.persist, type, type.boolean], 16, "enabled"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetProcessPriority"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon pushes a debug force pair for every agent unconditionally; the JS port collects them only when group.collectForces is set to keep the per-agent loop allocation-free.")], 18, "CalculateBehavior"]], 0, void 0, CjsModel));
    }
    /** m_priority (int32_t) [READWRITE, PERSIST, NOTIFY, ENUM] */
    behaviorPriority = (_initProto(this), _init_behaviorPriority(this, 0));

    /** rand1 (float) [READWRITE, PERSIST] */
    rand1 = (_init_extra_behaviorPriority(this), _init_rand(this, 0.2));

    /** rand2 (float) [READWRITE, PERSIST] */
    rand2 = (_init_extra_rand(this), _init_rand2(this, 0.8));

    /** rand3 (float) [READWRITE, PERSIST] */
    rand3 = (_init_extra_rand2(this), _init_rand3(this, 1.2));

    /** m_freq (float) [READWRITE, PERSIST] */
    freq = (_init_extra_rand3(this), _init_freq(this, 2));

    /** m_weightWander (float) [READWRITE, PERSIST] */
    weightWander = (_init_extra_freq(this), _init_weightWander(this, 240));

    /** m_enabled (bool) [READWRITE, PERSIST] */
    enabled = (_init_extra_weightWander(this), _init_enabled(this, true));
    #returnForces = (_init_extra_enabled(this), []);

    /** Carbon Wander::GetProcessPriority (cpp:23-26). */
    GetProcessPriority() {
      return this.behaviorPriority;
    }

    /**
     * Adds a per-agent Perlin wander force seeded from lifetime + id (Carbon
     * CalculateBehavior, cpp:28-52; PerlinNoise1D maps to carbonPerlin1D).
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
      for (const agent of agents) {
        const seed = agent.lifetime + agent.id;
        vec3.set(FORCE, carbonPerlin1D(seed * this.rand1 * this.freq, 2, 1, 1), carbonPerlin1D(seed * this.rand2 * this.freq, 2, 1, 1), carbonPerlin1D(seed * this.rand3 * this.freq, 2, 1, 1));
        if (group.collectForces) {
          vec3.normalize(FORCE_OFFSET, FORCE);
          vec3.scale(FORCE_OFFSET, FORCE_OFFSET, group.GetBoundingSphereRadius());
          returnForces.push(vec3.add(vec3.create(), agent.position, FORCE_OFFSET));
        }
        vec3.scale(FORCE, FORCE, this.weightWander);
        if (group.collectForces) {
          returnForces.push(vec3.clone(FORCE));
        }
        vec3.add(agent.acceleration, agent.acceleration, FORCE);
      }
      return returnForces;
    }
  }];
  ProcessPriority = ProcessPriority;
  constructor() {
    super(_Wander), _initClass();
  }
}();

export { _Wander as Wander };
//# sourceMappingURL=Wander.js.map
