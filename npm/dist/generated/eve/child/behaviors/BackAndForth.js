import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl, schema } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { EveLocatorSets as _EveLocatorSets } from '../../../../eve/locator/EveLocatorSets.js';

let _initProto, _initClass, _init_behaviorPriority, _init_extra_behaviorPriority, _init_enabled, _init_extra_enabled, _init_locatorType, _init_extra_locatorType, _init_locatorSet, _init_extra_locatorSet, _init_arrivedRadius, _init_extra_arrivedRadius, _init_distFromOrigin, _init_extra_distFromOrigin, _init_slowDownRadius, _init_extra_slowDownRadius, _init_backAndForthWeight, _init_extra_backAndForthWeight, _init_fxBehavior, _init_extra_fxBehavior, _init_target, _init_extra_target, _init_parent, _init_extra_parent, _init_secondsToTurn, _init_extra_secondsToTurn, _init_locatorSetName, _init_extra_locatorSetName;

// Module scratch for the per-agent loop (behavior updates run sequentially).
const Z_AXIS = vec3.fromValues(0, 0, 1);
const UP_AXIS = vec3.fromValues(0, 1, 0);
const TARGET_POINT = vec3.create();
const AGENT_POSITION_WS = vec3.create();
const DESIRED_VELOCITY = vec3.create();
const INV_DIR = vec3.create();
const NO_FORCES = [];

/** BackAndForth (eve/child/behaviors) - generated from schema shapeHash 65fc70a3.... */
let _BackAndForth;
new class extends _identity {
  static [class BackAndForth extends CjsModel {
    static {
      ({
        e: [_init_behaviorPriority, _init_extra_behaviorPriority, _init_enabled, _init_extra_enabled, _init_locatorType, _init_extra_locatorType, _init_locatorSet, _init_extra_locatorSet, _init_arrivedRadius, _init_extra_arrivedRadius, _init_distFromOrigin, _init_extra_distFromOrigin, _init_slowDownRadius, _init_extra_slowDownRadius, _init_backAndForthWeight, _init_extra_backAndForthWeight, _init_fxBehavior, _init_extra_fxBehavior, _init_target, _init_extra_target, _init_parent, _init_extra_parent, _init_secondsToTurn, _init_extra_secondsToTurn, _init_locatorSetName, _init_extra_locatorSetName, _initProto],
        c: [_BackAndForth, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "BackAndForth",
        family: "eve/child/behaviors"
      })], [[[io, io.notify, io, io.persist, type, type.int32], 16, "behaviorPriority"], [[io, io.notify, io, io.persist, type, type.boolean], 16, "enabled"], [[io, io.notify, io, io.persist, type, type.int32, void 0, schema.enum("LocatorType")], 16, "locatorType"], [[io, io.persist, void 0, type.list("EveLocatorSets")], 16, "locatorSet"], [[io, io.persist, type, type.float32], 16, "arrivedRadius"], [[io, io.persist, type, type.float32], 16, "distFromOrigin"], [[io, io.persist, type, type.float32], 16, "slowDownRadius"], [[io, io.persist, type, type.float32], 16, "backAndForthWeight"], [[io, io.persist, void 0, type.model("IBehavior")], 16, "fxBehavior"], [[io, io.persist, void 0, type.model("EveSpaceObject2")], 16, "target"], [[io, io.persist, void 0, type.model("EveSpaceObject2")], 16, "parent"], [[io, io.readwrite, type, type.float32], 16, "secondsToTurn"], [[io, io.persist, type, type.string], 16, "locatorSetName"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetProcessPriority"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetBehaviorName"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon returns a byte size; the JS port models scratch as one plain record per agent, so any non-zero value means 'has scratch'.")], 18, "GetScratchMemorySize"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon initializes caller-provided raw memory; the JS port returns the fresh record instead.")], 18, "InitializeScratch"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("TriRandInt maps to Math.random and Be::Time fx timestamps to Date.now seconds; the steering math is ported verbatim.")], 18, "CalculateBehavior"], [[carbon, carbon.method, impl, impl.implemented], 18, "AddLocatorSet"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetParent"]], 0, void 0, CjsModel));
    }
    /** m_priority (int32_t) [READWRITE, PERSIST, NOTIFY, ENUM] */
    behaviorPriority = (_initProto(this), _init_behaviorPriority(this, 0));

    /** m_enabled (bool) [READWRITE, PERSIST, NOTIFY, ENUM] */
    enabled = (_init_extra_behaviorPriority(this), _init_enabled(this, true));

    /** m_locatorType (LocatorType - enum LocatorType) [READWRITE, PERSIST, ENUM, NOTIFY] */
    locatorType = (_init_extra_enabled(this), _init_locatorType(this, 0));

    /** m_locatorSets (PEveLocatorSetsVector) [READ, PERSIST] */
    locatorSet = (_init_extra_locatorType(this), _init_locatorSet(this, []));

    /** m_arrivedRadius (float) [READWRITE, PERSIST] */
    arrivedRadius = (_init_extra_locatorSet(this), _init_arrivedRadius(this, 50));

    /** m_distFromOrigin (float) [READWRITE, PERSIST] */
    distFromOrigin = (_init_extra_arrivedRadius(this), _init_distFromOrigin(this, 20));

    /** m_slowDownRadius (float) [READWRITE, PERSIST] */
    slowDownRadius = (_init_extra_distFromOrigin(this), _init_slowDownRadius(this, 200));

    /** m_backAndForthWeight (float) [READWRITE, PERSIST] */
    backAndForthWeight = (_init_extra_slowDownRadius(this), _init_backAndForthWeight(this, 100));

    /** m_fxBehavior (IBehavior*) [READWRITE, PERSIST] */
    fxBehavior = (_init_extra_backAndForthWeight(this), _init_fxBehavior(this, null));

    /** m_target (EveSpaceObject2*) [READWRITE, PERSIST] */
    target = (_init_extra_fxBehavior(this), _init_target(this, null));

    /** m_parent (EveSpaceObject2*) [READWRITE, PERSIST] */
    parent = (_init_extra_target(this), _init_parent(this, null));

    /** m_seconds (float) [READWRITE] */
    secondsToTurn = (_init_extra_parent(this), _init_secondsToTurn(this, 0.25));

    /** m_locatorSetName (BlueSharedString) [READWRITE, PERSIST] */
    locatorSetName = (_init_extra_secondsToTurn(this), _init_locatorSetName(this, "damage"));

    // Debug arrival point (Carbon m_arrivalPoint).
    #arrivalPoint = (_init_extra_locatorSetName(this), vec3.create());

    /** Carbon BackAndForth::GetProcessPriority (cpp:31-34). */
    GetProcessPriority() {
      return this.behaviorPriority;
    }

    /** Carbon BackAndForth::GetBehaviorName (cpp:36-39). */
    GetBehaviorName() {
      return "BackAndForth";
    }

    /** Per-agent scratch record count (Carbon sizeof(BackAndForthData)). */
    GetScratchMemorySize() {
      return 1;
    }

    /** Fresh per-agent scratch record (Carbon BackAndForthData placement init). */
    InitializeScratch() {
      return {
        locatorTarget: vec3.create(),
        locatorDirection: vec3.create(),
        locatorIndex: -1,
        seek: true,
        deliver: false,
        arrived: true,
        timePassed: 0
      };
    }

    /**
     * Shuttles each agent between its seek/deliver (or parent/target) locators
     * with arrival slow-down, facing snap, and PlayFX triggering (Carbon
     * CalculateBehavior, cpp:51-194).
     * @param {Array} agents - DroneAgent records
     * @param {Array} scratchData - per-agent BackAndForthData records
     * @param {Number} deltaTime
     * @param {Object} group - owning BehaviorGroup
     * @param {Object} system - owning EveChildBehaviorSystem
     * @param {Array} _dronesInSearchRadius - unused
     * @returns {Array} empty (as Carbon)
     */
    CalculateBehavior(agents, scratchData, deltaTime, group, system, _dronesInSearchRadius) {
      if (!this.enabled) {
        return NO_FORCES;
      }
      if (this.fxBehavior === null) {
        this.fxBehavior = group.GetBehaviorByName("PlayFX");
      }
      const worldTransform = system.GetWorldTransform();
      for (let c = 0; c < agents.length; c++) {
        const agent = agents[c];
        const data = scratchData?.[c];
        if (!data) {
          continue;
        }
        if (this.locatorType === _BackAndForth.LocatorType.LOCAL_LOCATORS) {
          if (data.arrived) {
            if (data.seek) {
              const seekLocators = this.#GetLocatorsForSet("seek");
              if (seekLocators !== null && seekLocators.length > 0) {
                const index = Math.floor(Math.random() * seekLocators.length);
                vec3.copy(data.locatorTarget, seekLocators[index].position);
                vec3.transformQuat(data.locatorDirection, UP_AXIS, seekLocators[index].direction);
              }
            } else if (data.deliver) {
              const deliverLocators = this.#GetLocatorsForSet("deliver");
              if (deliverLocators !== null && deliverLocators.length > 0) {
                const index = Math.floor(Math.random() * deliverLocators.length);
                vec3.copy(data.locatorTarget, deliverLocators[index].position);
                vec3.transformQuat(data.locatorDirection, UP_AXIS, deliverLocators[index].direction);
              }
            }
            data.arrived = false;
          }
        } else if (this.locatorType === _BackAndForth.LocatorType.PARENT_LOCATORS) {
          if (this.parent === null) {
            this.parent = group.GetParent();
          }
          if (data.arrived && this.parent) {
            // Pick a new locator to go to
            const count = Number(this.parent.GetLocatorCount?.(this.locatorSetName) ?? 0);
            data.locatorIndex = Math.floor(Math.random() * Math.max(count, 1));
          }
          this.#GetOwnerLocatorPosition(this.parent, data);
          data.arrived = false;
        } else if (this.locatorType === _BackAndForth.LocatorType.TARGET_LOCATORS) {
          if (data.arrived && this.target) {
            // Pick a new locator to go to
            const count = Number(this.target.GetLocatorCount?.(this.locatorSetName) ?? 0);
            data.locatorIndex = Math.floor(Math.random() * Math.max(count, 1));
          }
          this.#GetOwnerLocatorPosition(this.target, data);
          data.arrived = false;
        }
        vec3.copy(agent.target, data.locatorTarget);

        // If the direction is (0,0,0) it points up, but then the slow-down
        // radius won't work
        if (vec3.squaredLength(data.locatorDirection) === 0) {
          vec3.set(data.locatorDirection, 0, 1, 0);
        }
        vec3.normalize(TARGET_POINT, data.locatorDirection);
        vec3.scale(TARGET_POINT, TARGET_POINT, this.distFromOrigin);
        vec3.add(TARGET_POINT, TARGET_POINT, data.locatorTarget);

        // For debugging
        vec3.copy(this.#arrivalPoint, TARGET_POINT);
        vec3.transformMat4(AGENT_POSITION_WS, agent.position, worldTransform);
        vec3.subtract(DESIRED_VELOCITY, TARGET_POINT, AGENT_POSITION_WS);
        const distance = vec3.length(DESIRED_VELOCITY);
        vec3.normalize(DESIRED_VELOCITY, DESIRED_VELOCITY);

        // If we are approaching the target
        if (distance < this.slowDownRadius) {
          // make the agent slow down before arriving at target
          vec3.scale(DESIRED_VELOCITY, DESIRED_VELOCITY, this.backAndForthWeight * (distance / this.slowDownRadius));

          // Set the rotation of the drone
          vec3.subtract(INV_DIR, data.locatorTarget, AGENT_POSITION_WS);
          vec3.normalize(INV_DIR, INV_DIR);
          if (vec3.squaredLength(INV_DIR) > 0) {
            quat.rotationTo(agent.rotation, Z_AXIS, INV_DIR);
          }
          data.timePassed = 0;

          // Start playing fx when slowing down
          if (!agent.playFX && this.fxBehavior !== null) {
            agent.fxStartTime = Date.now() / 1000;
            agent.playFX = true;
          }

          // If the agent has arrived at the target, switch targets
          if (distance < this.arrivedRadius) {
            const seek = data.seek;
            data.seek = data.deliver;
            data.deliver = seek;
            data.arrived = true;
          }
        } else {
          // Have the drone slowly start moving based on time passed
          data.timePassed += deltaTime;
          data.timePassed = Math.max(data.timePassed, this.secondsToTurn);
          vec3.scale(DESIRED_VELOCITY, DESIRED_VELOCITY, Math.max(data.timePassed, this.secondsToTurn) / this.secondsToTurn);
        }
        vec3.add(agent.acceleration, agent.acceleration, DESIRED_VELOCITY);
        vec3.subtract(agent.acceleration, agent.acceleration, agent.velocity);
      }
      return NO_FORCES;
    }

    /** Carbon method AddLocatorSet (MAP_METHOD_AND_WRAP). */
    AddLocatorSet() {
      const seek = new _EveLocatorSets();
      seek.SetName("seek");
      const deliver = new _EveLocatorSets();
      deliver.SetName("deliver");
      this.locatorSet.push(seek, deliver);
    }

    /** Carbon BackAndForth::SetParent (cpp:348-354). */
    SetParent(parent) {
      this.parent = parent ?? null;
    }

    // Carbon GetLocatorsForSet (cpp:322-332): first locator set with the name.
    #GetLocatorsForSet(setName) {
      for (const set of this.locatorSet) {
        if (set?.HasName?.(setName)) {
          return set.GetLocators();
        }
      }
      return null;
    }

    // Carbon GetParentLocatorPosition/GetTargetLocatorPosition (cpp:356-372):
    // world-space locator position and +Y direction from the owner's named set.
    #GetOwnerLocatorPosition(owner, data) {
      if (owner) {
        owner.GetLocatorPositionFromSet?.(data.locatorIndex, true, this.locatorSetName, data.locatorTarget);
        owner.GetLocatorRotationFromSet?.(data.locatorIndex, true, this.locatorSetName, data.locatorDirection);
      }
    }
  }];
  LocatorType = Object.freeze({
    LOCAL_LOCATORS: 0,
    PARENT_LOCATORS: 1,
    TARGET_LOCATORS: 2
  });
  constructor() {
    super(_BackAndForth), _initClass();
  }
}();

export { _BackAndForth as BackAndForth };
//# sourceMappingURL=BackAndForth.js.map
