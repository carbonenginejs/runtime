import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

let _initProto, _initClass, _init_behaviorPriority, _init_extra_behaviorPriority, _init_behaviorWeight, _init_extra_behaviorWeight, _init_inFormation, _init_extra_inFormation, _init_maxFormationVelocityScaler, _init_extra_maxFormationVelocityScaler, _init_stubbornness, _init_extra_stubbornness, _init_enabled, _init_extra_enabled, _init_framesBetweenUpdates, _init_extra_framesBetweenUpdates;

// Module scratch for the per-agent loops (behavior updates run sequentially).
const ACCEL_NORMALIZED = vec3.create();
const GROUP_ALIGNMENT = vec3.create();
const SLOT_VECTOR = vec3.create();
const TARGET_DIR = vec3.create();
const UP_AXIS = vec3.fromValues(0, 1, 0);
const ROTATION_AXIS = vec3.create();
const ROTATION_QUAT = quat.create();
const FORMATION_ACCELERATION = vec3.create();
const NO_FORCES = [];

// Carbon ClampLength: in-place clamp of a vec3 to a maximum length.
function ClampLength(value, maxLength) {
  const lengthSq = vec3.squaredLength(value);
  if (lengthSq > maxLength * maxLength && lengthSq > 0) {
    vec3.scale(value, value, maxLength / Math.sqrt(lengthSq));
  }
  return value;
}

/** A steering behaviour that detects when a drone group's motion has converged, organises the agents into a rotating slot grid, and pulls each agent toward its assigned slot. */
let _Formation;
class Formation extends CjsModel {
  static {
    ({
      e: [_init_behaviorPriority, _init_extra_behaviorPriority, _init_behaviorWeight, _init_extra_behaviorWeight, _init_inFormation, _init_extra_inFormation, _init_maxFormationVelocityScaler, _init_extra_maxFormationVelocityScaler, _init_stubbornness, _init_extra_stubbornness, _init_enabled, _init_extra_enabled, _init_framesBetweenUpdates, _init_extra_framesBetweenUpdates, _initProto],
      c: [_Formation, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Formation",
      family: "eve/child/behaviors"
    })], [[[io, io.notify, io, io.persist, type, type.int32], 16, "behaviorPriority"], [[io, io.persist, type, type.float32], 16, "behaviorWeight"], [[io, io.read, type, type.boolean], 16, "inFormation"], [[io, io.persist, type, type.float32], 16, "maxFormationVelocityScaler"], [[io, io.persist, type, type.int32], 16, "stubbornness"], [[io, io.persist, type, type.boolean], 16, "enabled"], [[io, io.persist, type, type.int32], 16, "framesBetweenUpdates"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetProcessPriority"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetBehaviorName"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon returns a byte size; the JS port models scratch as one plain record per agent, so any non-zero value means 'has scratch'.")], 18, "GetScratchMemorySize"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon initializes caller-provided raw memory; the JS port returns the fresh record instead.")], 18, "InitializeScratch"], [[carbon, carbon.method, impl, impl.implemented], 18, "InFormation"], [[carbon, carbon.method, impl, impl.implemented], 18, "Reset"], [[carbon, carbon.method, impl, impl.implemented], 18, "CalculateBehavior"]], 0, void 0, CjsModel));
  }
  /** m_priority (int32_t) [READWRITE, PERSIST, NOTIFY, ENUM] */
  behaviorPriority = (_initProto(this), _init_behaviorPriority(this, 0));

  /** m_behaviorWeight (float) [READWRITE, PERSIST] */
  behaviorWeight = (_init_extra_behaviorPriority(this), _init_behaviorWeight(this, 300));

  /** m_inFormation (bool) [READ] */
  inFormation = (_init_extra_behaviorWeight(this), _init_inFormation(this, false));

  /** m_maxFormationVelocityScaler (float) [READWRITE, PERSIST] */
  maxFormationVelocityScaler = (_init_extra_inFormation(this), _init_maxFormationVelocityScaler(this, 0.85));

  /** m_stubbornness (int32_t) [READWRITE, PERSIST] */
  stubbornness = (_init_extra_maxFormationVelocityScaler(this), _init_stubbornness(this, 3));

  /** m_enabled (bool) [READWRITE, PERSIST] */
  enabled = (_init_extra_stubbornness(this), _init_enabled(this, true));

  /** m_framesBetweenUpdates (int32_t) [READWRITE, PERSIST] */
  framesBetweenUpdates = (_init_extra_enabled(this), _init_framesBetweenUpdates(this, 15));

  // Carbon runtime state: the slot grid (vec3 offsets from the formation
  // centre), its reservation flags, and the frame/consistency counters.
  #formationGrid = (_init_extra_framesBetweenUpdates(this), []);
  #formationGridReserver = [];
  #formationPosition = vec3.create();
  #formationSpeed = vec3.create();
  #formationAcceleration = vec3.create();
  #lastFormationAcceleration = vec3.create();
  #isFormalizing = false;
  #frameCounter = 0;
  #stubbornnessCounter = 0;

  /** Carbon Formation::GetProcessPriority (cpp:43-46). */
  GetProcessPriority() {
    return this.behaviorPriority;
  }

  /** Carbon Formation::GetBehaviorName (cpp:48-51). */
  GetBehaviorName() {
    return "Formation";
  }

  /** Per-agent scratch record count (Carbon sizeof(FormationData)). */
  GetScratchMemorySize() {
    return 1;
  }

  /** Fresh per-agent scratch record (Carbon FormationData placement init). */
  InitializeScratch() {
    return {
      assignedSlot: -1
    };
  }

  /** Carbon Formation::InFormation (cpp:53-56). */
  InFormation() {
    return this.inFormation;
  }

  /** Carbon Formation::Reset (cpp:261-264). */
  Reset() {
    this.#BreakFormation();
  }

  /**
   * Consistency-gated formation state machine: checks whether the agents keep
   * agreeing on a direction, forms/breaks the grid accordingly, and drives
   * agents to their assigned slots while formed (Carbon CalculateBehavior,
   * cpp:58-125).
   * @param {Array} agents - DroneAgent records
   * @param {Array} scratchData - per-agent FormationData records
   * @param {Number} deltaTime
   * @param {Object} group - owning BehaviorGroup
   * @param {Object} _system - owning EveChildBehaviorSystem
   * @param {Array} _dronesInSearchRadius - unused
   * @returns {Array} empty (as Carbon)
   */
  CalculateBehavior(agents, scratchData, deltaTime, group, _system, _dronesInSearchRadius) {
    if (!this.enabled) {
      return NO_FORCES;
    }
    if (this.#frameCounter >= this.framesBetweenUpdates) {
      // we'll do a check
      if (this.#CheckIfFormalizing(agents, scratchData)) {
        // we only enable formation if the check passes a few times in a row
        if (!this.inFormation && this.#stubbornnessCounter >= this.stubbornness) {
          this.#InitializeFormation(agents, scratchData, group.GetBoundingSphereRadius());
        } else {
          if (this.#isFormalizing === true) {
            this.#stubbornnessCounter++;
          } else {
            this.#stubbornnessCounter = 0;
          }
          this.#isFormalizing = true;
        }
      } else {
        if (this.inFormation && this.#stubbornnessCounter >= this.stubbornness) {
          this.#BreakFormation();
        } else {
          if (this.#isFormalizing === true) {
            this.#stubbornnessCounter++;
          } else {
            this.#stubbornnessCounter = 0;
          }
          this.#isFormalizing = false;
        }
      }
    } else {
      this.#frameCounter++;
    }
    if (this.inFormation) {
      this.#UpdateFormation(deltaTime, group);
      this.#UpdateAgents(agents, scratchData, group.GetBoundingSphereRadius());
    }
    return NO_FORCES;
  }

  // Tests whether the agents are being dragged the same way, only accounting
  // for behaviors that ran before this one (Carbon CheckIfFormalizing,
  // cpp:127-170).
  /**
   * Whether the agents' accelerations, or once formed their pull toward their assigned slots, agree on a common direction.
   */
  #CheckIfFormalizing(agents, scratchData) {
    if (agents.length === 0) {
      return false;
    }
    let disagreeingDrones = 0;
    vec3.normalize(GROUP_ALIGNMENT, agents[0].acceleration);
    vec3.set(this.#formationAcceleration, 0, 0, 0);
    for (let c = 0; c < agents.length; c++) {
      const agent = agents[c];
      const data = scratchData?.[c];
      vec3.normalize(ACCEL_NORMALIZED, agent.acceleration);
      if (!(vec3.dot(ACCEL_NORMALIZED, GROUP_ALIGNMENT) > 0)) {
        if (this.inFormation) {
          const slot = this.#formationGrid[data?.assignedSlot ?? -1];
          if (slot) {
            vec3.add(SLOT_VECTOR, this.#formationPosition, slot);
            vec3.subtract(SLOT_VECTOR, SLOT_VECTOR, agent.position);
            vec3.normalize(SLOT_VECTOR, SLOT_VECTOR);
            if (vec3.dot(ACCEL_NORMALIZED, SLOT_VECTOR) < 0) {
              disagreeingDrones++;
            }
          }
        } else {
          disagreeingDrones++;
          vec3.lerp(GROUP_ALIGNMENT, GROUP_ALIGNMENT, ACCEL_NORMALIZED, 0.5);
        }
      }
      vec3.add(this.#formationAcceleration, this.#formationAcceleration, ACCEL_NORMALIZED);
    }
    if (disagreeingDrones >= 0.1 * agents.length) {
      return false;
    }
    return true;
  }

  // Finds the centre point, builds the slot grid, and assigns each agent its
  // nearest free slot (Carbon InitializeFormation, cpp:172-195).
  /**
   * Computes the group's centre from the agent positions, builds the slot grid, assigns each agent a slot, and marks the group in formation.
   */
  #InitializeFormation(agents, scratchData, radius) {
    if (agents.length === 0) {
      return;
    }
    vec3.set(this.#formationPosition, 0, 0, 0);
    vec3.set(TARGET_DIR, 0, 0, 0);
    for (const agent of agents) {
      vec3.add(this.#formationPosition, this.#formationPosition, agent.position);
      vec3.add(TARGET_DIR, TARGET_DIR, agent.acceleration);
    }
    vec3.scale(this.#formationPosition, this.#formationPosition, 1 / agents.length);
    this.#CreateFormationGrid(agents, TARGET_DIR, radius);
    this.#AssignSlots(agents, scratchData);
    this.inFormation = true;
  }

  // Builds a square slot grid facing the group's pull direction (Carbon
  // CreateFormationGrid, cpp:197-225). Grid slots are allocated here - a
  // formation-creation event, not the per-frame path.
  /**
   * Builds a square grid of slot offsets around the formation centre, oriented to face the group's average pull direction.
   */
  #CreateFormationGrid(agents, targetDir, radius) {
    targetDir[1] = this.#formationPosition[1];
    vec3.normalize(targetDir, targetDir);
    const angle = vec3.angle(UP_AXIS, targetDir);
    quat.setAxisAngle(ROTATION_QUAT, UP_AXIS, angle);
    this.#formationGrid.length = 0;
    this.#formationGridReserver.length = 0;
    let num = agents.length;
    num = Math.floor(Math.sqrt(num - 1)) + 1;
    for (let i = 0; i < num; i++) {
      for (let j = 0; j < num; j++) {
        const r = 2.5 * radius;
        const slot = vec3.fromValues((-(num / 2) + i) * r, 0, (-(num / 2) + j) * r);
        vec3.transformQuat(slot, slot, ROTATION_QUAT);
        this.#formationGrid.push(slot);
        this.#formationGridReserver.push(false);
      }
    }
  }

  // Nearest-free-slot assignment (Carbon AssignSlots, cpp:227-258).
  /**
   * Assigns each agent to its nearest unreserved formation slot.
   */
  #AssignSlots(agents, scratchData) {
    for (let c = 0; c < agents.length; c++) {
      const agent = agents[c];
      const data = scratchData?.[c];
      let nearestSlot = -1;
      let closestLength = 0;
      for (let index = 0; index < this.#formationGrid.length; index++) {
        if (!this.#formationGridReserver[index]) {
          vec3.add(SLOT_VECTOR, this.#formationPosition, this.#formationGrid[index]);
          vec3.subtract(SLOT_VECTOR, agent.position, SLOT_VECTOR);
          const lengthToSlot = vec3.squaredLength(SLOT_VECTOR);
          if (nearestSlot === -1 || lengthToSlot < closestLength) {
            nearestSlot = index;
            closestLength = lengthToSlot;
          }
        }
      }
      if (nearestSlot !== -1) {
        this.#formationGridReserver[nearestSlot] = true;
        if (data) {
          data.assignedSlot = nearestSlot;
        }
      }
    }
  }

  // Carbon BreakFormation (cpp:266-277).
  /**
   * Resets the formation's position, speed and acceleration state and clears the slot grid, taking the group out of formation.
   */
  #BreakFormation() {
    vec3.set(this.#formationPosition, 0, 0, 0);
    vec3.set(this.#formationSpeed, 0, 0, 0);
    vec3.set(this.#lastFormationAcceleration, 0, 0, 0);
    vec3.set(this.#formationAcceleration, 0, 0, 0);
    this.#isFormalizing = false;
    this.inFormation = false;
    this.#formationGrid.length = 0;
    this.#formationGridReserver.length = 0;
  }

  // Moves the formation centre like a single ship (Carbon UpdateFormation,
  // cpp:279-294).
  /**
   * Advances the formation centre each frame as if it were a single ship, applying inertia to its acceleration and clamping its speed.
   */
  #UpdateFormation(deltaTime, group) {
    vec3.copy(FORMATION_ACCELERATION, this.#formationAcceleration);
    this.#CalculateFormationInertia(FORMATION_ACCELERATION, deltaTime);
    vec3.add(this.#formationSpeed, this.#formationSpeed, FORMATION_ACCELERATION);
    ClampLength(this.#formationSpeed, group.GetMaxVelocity() * this.maxFormationVelocityScaler);
    vec3.scaleAndAdd(this.#formationPosition, this.#formationPosition, this.#formationSpeed, deltaTime);
  }

  // Limits the formation's angular speed and rotates the whole grid with it
  // (Carbon calculateFormationInertia, cpp:296-325).
  /**
   * Limits the formation's turn rate by rotating its acceleration toward the previous frame's direction, rotating the slot grid with it.
   */
  #CalculateFormationInertia(acceleration, deltaTime) {
    vec3.normalize(ACCEL_NORMALIZED, acceleration);
    if (vec3.squaredLength(this.#lastFormationAcceleration) !== 0) {
      vec3.cross(ROTATION_AXIS, this.#lastFormationAcceleration, ACCEL_NORMALIZED);
      vec3.normalize(ROTATION_AXIS, ROTATION_AXIS);
      if (vec3.length(ROTATION_AXIS) === 0) {
        vec3.set(ROTATION_AXIS, 0, 1, 0);
      }
      let angle = vec3.angle(this.#lastFormationAcceleration, ACCEL_NORMALIZED);
      const step = (0.1 + 2 / Math.max(1, this.#formationGrid.length)) * deltaTime;
      angle = Math.min(angle, step);
      if (angle > 0) {
        quat.setAxisAngle(ROTATION_QUAT, ROTATION_AXIS, angle);
        // Carbon rotates last frame's (unit) formation acceleration into the
        // working acceleration (TriVectorRotateQuaternion, cpp:314-315).
        vec3.transformQuat(acceleration, this.#lastFormationAcceleration, ROTATION_QUAT);
        for (const slot of this.#formationGrid) {
          vec3.transformQuat(slot, slot, ROTATION_QUAT);
        }
      }
    }
    vec3.normalize(this.#lastFormationAcceleration, acceleration);
  }

  // Damps the other behaviors and pulls each agent toward its slot (Carbon
  // UpdateAgents, cpp:327-347).
  /**
   * Damps each agent's incoming acceleration, pulls it toward its assigned slot, and slows it as it nears that slot.
   */
  #UpdateAgents(agents, scratchData, radius) {
    const radiusSq = radius * radius;
    for (let c = 0; c < agents.length; c++) {
      const agent = agents[c];
      const data = scratchData?.[c];
      const slot = this.#formationGrid[data?.assignedSlot ?? -1];
      if (!slot) {
        continue;
      }
      vec3.scale(agent.acceleration, agent.acceleration, 0.5); // reduce the effect of former behaviors

      vec3.add(SLOT_VECTOR, this.#formationPosition, slot);
      vec3.subtract(SLOT_VECTOR, SLOT_VECTOR, agent.position);
      const distToSlot = vec3.squaredLength(SLOT_VECTOR);
      if (distToSlot < 2 * radiusSq) {
        // drones can slow down based on dist to target
        const damping = 0.5 + 0.5 * Math.min(Math.max(distToSlot / radiusSq - 0.5 * radius, 0), 1);
        vec3.scale(agent.velocity, agent.velocity, damping);
      }
      vec3.normalize(SLOT_VECTOR, SLOT_VECTOR);
      vec3.scaleAndAdd(agent.acceleration, agent.acceleration, SLOT_VECTOR, this.behaviorWeight);
    }
  }
  static {
    _initClass();
  }
}

export { _Formation as Formation };
//# sourceMappingURL=Formation.js.map
