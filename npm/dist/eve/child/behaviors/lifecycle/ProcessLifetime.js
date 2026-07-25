import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl, schema } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { BELIST_REMOVED, BELIST_INSERTED, BELIST_LOADFINISHED, BELIST_EVENTMASK } from '../../../../controllers/contracts.js';
import { ProcessLifetimeData as _ProcessLifetimeData } from './ProcessLifetimeData.js';
import { TunnelGroupType, ProcessPriority } from '../enums.js';

let _initProto, _initClass, _init_behaviorPriority, _init_extra_behaviorPriority, _init_splineTunnels, _init_extra_splineTunnels, _init_respawnAgentsOnDeath, _init_extra_respawnAgentsOnDeath, _init_firstAgentLifetime, _init_extra_firstAgentLifetime, _init_returningAge, _init_extra_returningAge, _init_wanderAmount, _init_extra_wanderAmount, _init_firstSpawnAtRandomPlaces, _init_extra_firstSpawnAtRandomPlaces, _init_behaviorWeight, _init_extra_behaviorWeight, _init_exit, _init_extra_exit;

// Module scratch for the per-agent loop (behavior updates run sequentially).
const Z_AXIS = vec3.fromValues(0, 0, 1);
const TARGET_VECTOR = vec3.create();
const VECTOR_BETWEEN = vec3.create();
const VECTOR_PROJ = vec3.create();
const OFFSET = vec3.create();
const DESIRED_NORMALIZED = vec3.create();
const TARGET_NORMALIZED = vec3.create();
const BLEND_VECTOR = vec3.create();
const PULL_FORCE = vec3.create();
const FORCE_OFFSET = vec3.create();
const SPAWN_POSITION = vec3.create();
const SPAWN_ROTATION = vec3.create();

/** ProcessLifetime (eve/child/behaviors) - generated from schema shapeHash 1fd3ebfa.... */
let _ProcessLifetime;
new class extends _identity {
  static [class ProcessLifetime extends CjsModel {
    static {
      ({
        e: [_init_behaviorPriority, _init_extra_behaviorPriority, _init_splineTunnels, _init_extra_splineTunnels, _init_respawnAgentsOnDeath, _init_extra_respawnAgentsOnDeath, _init_firstAgentLifetime, _init_extra_firstAgentLifetime, _init_returningAge, _init_extra_returningAge, _init_wanderAmount, _init_extra_wanderAmount, _init_firstSpawnAtRandomPlaces, _init_extra_firstSpawnAtRandomPlaces, _init_behaviorWeight, _init_extra_behaviorWeight, _init_exit, _init_extra_exit, _initProto],
        c: [_ProcessLifetime, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "ProcessLifetime",
        family: "eve"
      })], [[[io, io.notify, io, io.persist, type, type.int32, void 0, schema.enum("ProcessPriority")], 16, "behaviorPriority"], [[io, io.notify, io, io.persist, void 0, type.list("SplineTunnelGroup")], 16, "splineTunnels"], [[io, io.persist, type, type.boolean], 16, "respawnAgentsOnDeath"], [[io, io.read, type, type.float32], 16, "firstAgentLifetime"], [[io, io.persist, type, type.float32], 16, "returningAge"], [[io, io.notify, io, io.persist, type, type.float32], 16, "wanderAmount"], [[io, io.notify, io, io.persist, type, type.boolean], 16, "firstSpawnAtRandomPlaces"], [[io, io.persist, type, type.float32], 16, "behaviorWeight"], [[io, io.readwrite, type, type.boolean], 16, "exit"], [[carbon, carbon.method, impl, impl.implemented], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Detaches removed groups instead of preserving Carbon's erroneous callback reattachment, and accepts portable Blue-list event arguments.")], 18, "OnListModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "OnModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetProcessPriority"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetBehaviorName"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon returns a byte size; the JS port models scratch as one plain record per agent, so any non-zero value means 'has scratch'.")], 18, "GetScratchMemorySize"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon initializes caller-provided raw memory; the JS port returns the fresh record instead.")], 18, "InitializeScratch"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateState"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("rand() maps to Math.random; debug force pairs are only collected when group.collectForces is set to keep the per-agent loop allocation-free.")], 18, "CalculateBehavior"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateTunnelRegistry"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Tr2DebugRendererOptions is represented by an injected Set-like option bag.")], 18, "GetDebugOptions"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("ITr2DebugRenderer2 is an injected engine-owned capability.")], 18, "RenderDebugInfo"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetEntrancePoints"]], 0, void 0, CjsModel));
    }
    /** m_priority (int32_t) [READWRITE, PERSIST, NOTIFY, ENUM] */
    behaviorPriority = (_initProto(this), _init_behaviorPriority(this, 0));

    /** m_splineTunnels (PSplineTunnelGroupVector) [READ, PERSIST, NOTIFY] */
    splineTunnels = (_init_extra_behaviorPriority(this), _init_splineTunnels(this, []));

    /** m_respawnAgentsOnDeath (bool) [READWRITE, PERSIST] */
    respawnAgentsOnDeath = (_init_extra_splineTunnels(this), _init_respawnAgentsOnDeath(this, true));

    /** m_firstAgentLifetime (float) [READ] */
    firstAgentLifetime = (_init_extra_respawnAgentsOnDeath(this), _init_firstAgentLifetime(this, 0));

    /** m_returningAge (float) [READWRITE, PERSIST] */
    returningAge = (_init_extra_firstAgentLifetime(this), _init_returningAge(this, -1));

    /** m_wanderAmount (float) [READWRITE, PERSIST, NOTIFY] */
    wanderAmount = (_init_extra_returningAge(this), _init_wanderAmount(this, 0.3));

    /** m_firstSpawnAtRandomPlaces (bool) [READWRITE, PERSIST, NOTIFY] */
    firstSpawnAtRandomPlaces = (_init_extra_wanderAmount(this), _init_firstSpawnAtRandomPlaces(this, true));

    /** m_behaviorWeight (float) [READWRITE, PERSIST] */
    behaviorWeight = (_init_extra_firstSpawnAtRandomPlaces(this), _init_behaviorWeight(this, 900));

    /** m_exit (bool) [READWRITE] */
    exit = (_init_extra_behaviorWeight(this), _init_exit(this, false));

    // Flattened tunnel pointers: system tunnels first, then local group
    // tunnels (Carbon m_privateTunnels).
    #privateTunnels = (_init_extra_exit(this), []);

    // Carbon m_shouldReassignTunnelIDs/m_intialSpawn/m_desiredVector state.
    #shouldReassignTunnelIDs = true;
    #intialSpawn = false;
    #desiredVector = vec3.create();
    #returnForces = [];
    #dronesThatDie = [];
    #tunnelGroupSnapshot = [];

    /** Carbon ProcessLifetime::Initialize (cpp:33-38). */
    Initialize() {
      this.#intialSpawn = this.firstSpawnAtRandomPlaces;
      this.#WireTunnelGroups();
      this.UpdateTunnelRegistry();
      return true;
    }

    /** Carbon ProcessLifetime::OnListModified. */
    OnListModified(event, _key = 0, _key2 = 0, value = null, list = null) {
      if (list !== this.splineTunnels) return;
      const maskedEvent = Number(event) & BELIST_EVENTMASK;
      if (maskedEvent === BELIST_REMOVED) {
        value?.SetSystemTunnelFunctionReferenceAndColor?.(null, 0xff5555aa);
      } else if (![BELIST_INSERTED, BELIST_LOADFINISHED].includes(maskedEvent)) {
        this.UpdateTunnelRegistry();
        return;
      }
      this.#WireTunnelGroups();
      this.UpdateTunnelRegistry();
    }

    /** Carbon ProcessLifetime::OnModified (cpp:27-31). */
    OnModified(_value = null) {
      this.UpdateTunnelRegistry();
      return true;
    }

    /** Carbon ProcessLifetime::GetProcessPriority (cpp:74-77). */
    GetProcessPriority() {
      return this.behaviorPriority;
    }

    /** Carbon ProcessLifetime::GetBehaviorName (cpp:79-82). */
    GetBehaviorName() {
      return "ProcessLifetime";
    }

    /** Per-agent scratch record count (Carbon sizeof(ProcessLifetimeData)). */
    GetScratchMemorySize() {
      return 1;
    }

    /** Fresh per-agent scratch record (Carbon ProcessLifetimeData placement init). */
    InitializeScratch() {
      return new _ProcessLifetimeData();
    }

    /** Carbon IBehavior::UpdateState override (h:59-62). */
    UpdateState(state) {
      this.exit = !!state;
    }

    /**
     * The drone lifecycle state machine: spawns each agent at an entrance
     * tunnel, flies it through its assigned entry tunnel, and - once m_exit or
     * m_returningAge triggers - assigns the closest exit tunnel, flies it out,
     * removes it, and optionally respawns it (Carbon CalculateBehavior,
     * cpp:94-213).
     * @param {Array} agents - DroneAgent records
     * @param {Array} scratchData - per-agent ProcessLifetimeData records
     * @param {Number} deltaTime
     * @param {Object} group - owning BehaviorGroup
     * @param {Object} system - owning EveChildBehaviorSystem
     * @param {Array} _dronesInSearchRadius - unused
     * @returns {Array} debug force pairs when group.collectForces is on
     */
    CalculateBehavior(agents, scratchData, deltaTime, group, system, _dronesInSearchRadius) {
      if (!this.#TunnelGroupsMatchSnapshot()) {
        this.#WireTunnelGroups();
        this.UpdateTunnelRegistry();
      }
      if (this.#shouldReassignTunnelIDs) {
        // JS has no Blue list notify, so the local tunnel list refreshes here
        // before the system tunnels are prepended (Carbon relies on
        // OnListModified having filled m_privateTunnels already).
        this.UpdateTunnelRegistry();
        this.#ReassignTunnelIDsAndAddSystemTunnels(system);
      }
      const forceVectors = this.#returnForces;
      forceVectors.length = 0;
      const dronesThatDie = this.#dronesThatDie;
      dronesThatDie.length = 0;
      for (let index = 0; index < agents.length; index++) {
        const drone = agents[index];
        const data = scratchData?.[index];
        if (!data) {
          continue;
        }
        if (drone.lifetime <= deltaTime && !this.#intialSpawn) {
          this.#FindASpawnPoint(drone, data, group);
        }

        // find an initial spawn position
        if (!data.hasSpawned && this.#intialSpawn) {
          vec3.copy(SPAWN_POSITION, group.spawnPosition);
          const systemTunnels = system.GetSplineTunnels?.() ?? [];
          if (this.#FindInitialSpawnPoint(drone, data, SPAWN_POSITION, systemTunnels)) {
            vec3.copy(group.spawnPosition, SPAWN_POSITION);
          }
          data.hasSpawned = true;
        }
        vec3.set(this.#desiredVector, 0, 0, 0);
        if (!data.hasUsedEntryTunnel) {
          if (data.assignedLifeTimeTunnel === -1) {
            data.hasUsedEntryTunnel = true;
          } else if (data.assignedLifeTimeTunnel >= this.#privateTunnels.length) {
            data.hasUsedEntryTunnel = true;
          } else if (this.#privateTunnels.length > 0) {
            if (data.assignedLifeTimeTunnel < this.#privateTunnels.length && this.#ProcessTunnel(drone, this.#privateTunnels[data.assignedLifeTimeTunnel], data, group.GetBoundingSphereRadius())) {
              data.tunnelPoint = 0;
              data.hasUsedEntryTunnel = true;
              data.assignedLifeTimeTunnel = -1;
            }
          }
        }
        if (this.exit || this.returningAge !== -1 && drone.lifetime > this.returningAge) {
          // If the drone has exited then remove it
          if (data.hasUsedExitTunnel) {
            dronesThatDie.push(index);
          } else if (data.assignedLifeTimeTunnel === -1) {
            this.#FindAndAssignAnExitTunnel(drone, data);
          } else if (this.#privateTunnels.length > 0 && data.assignedLifeTimeTunnel < this.#privateTunnels.length && this.#ProcessTunnel(drone, this.#privateTunnels[data.assignedLifeTimeTunnel], data, group.GetBoundingSphereRadius())) {
            data.hasUsedExitTunnel = true;
            dronesThatDie.push(index);
          }
        }
        if (vec3.squaredLength(this.#desiredVector) === 0) {
          continue;
        }
        vec3.normalize(PULL_FORCE, this.#desiredVector);
        if (group.collectForces) {
          vec3.scale(FORCE_OFFSET, PULL_FORCE, group.GetBoundingSphereRadius());
          forceVectors.push(vec3.add(vec3.create(), drone.position, FORCE_OFFSET));
        }
        vec3.scale(PULL_FORCE, PULL_FORCE, this.behaviorWeight);
        if (group.collectForces) {
          forceVectors.push(vec3.clone(PULL_FORCE));
        }
        vec3.add(drone.acceleration, drone.acceleration, PULL_FORCE);
      }
      this.#intialSpawn = false;
      for (let i = dronesThatDie.length - 1; i >= 0; i--) {
        group.RemoveSpecificAgent(dronesThatDie[i]);
        if (this.respawnAgentsOnDeath) {
          group.AddAgent();
        }
      }

      // debug
      if (agents.length !== 0) {
        this.firstAgentLifetime = agents[0].lifetime;
      }
      return forceVectors;
    }

    /**
     * Rebuilds the local tunnel list from this behavior's own spline tunnel
     * groups and flags the ID reassignment (Carbon UpdateTunnelRegistry,
     * cpp:446-462).
     */
    UpdateTunnelRegistry() {
      this.#privateTunnels.length = 0;
      for (const tunnelGroup of this.splineTunnels) {
        const tunnels = tunnelGroup?.GetTunnels?.() ?? tunnelGroup?.tunnels;
        if (!Array.isArray(tunnels)) {
          continue;
        }
        for (const tunnel of tunnels) {
          this.#privateTunnels.push(tunnel);
        }
      }
      this.#shouldReassignTunnelIDs = true;
    }

    /** Adds Carbon's spline-tunnel debug option. */
    GetDebugOptions(options = new Set()) {
      if (options?.add) options.add("SplineTunnels");else options?.insert?.("SplineTunnels");
      return options;
    }

    /** Delegates local tunnel debug geometry when its option is enabled. */
    RenderDebugInfo(renderer, _agents, parentWorldLocation) {
      if (!renderer?.HasOption?.(this, "SplineTunnels")) return;
      for (const group of this.splineTunnels) {
        group?.RenderDebugInfo?.(renderer, parentWorldLocation);
      }
    }

    /**
     * First positions of every entrance tunnel; used by SpawnDrones to pick
     * timed spawn points (Carbon GetEntrancePoints, cpp:428-444).
     */
    GetEntrancePoints() {
      const entrancePoints = [];
      for (const tunnel of this.#privateTunnels) {
        if (tunnel.tunnelGroupType === TunnelGroupType.ENTRANCE_TUNNELS) {
          if (tunnel.splinePoints.length !== 0) {
            entrancePoints.push(vec3.clone(tunnel.splinePoints[0].pos));
          }
        }
      }
      return entrancePoints;
    }

    // Prepends the system-wide tunnels and reassigns sequential IDs (Carbon
    // ReassignTunnelIDsAndAddSystemTunnels, cpp:464-494).
    #ReassignTunnelIDsAndAddSystemTunnels(system) {
      const localTunnels = this.#privateTunnels.slice();
      const systemTunnels = Array.from(system.GetTunnels?.() ?? []);
      this.#privateTunnels.length = 0;
      this.#privateTunnels.push(...systemTunnels, ...localTunnels);
      for (let id = 0; id < this.#privateTunnels.length; id++) {
        this.#privateTunnels[id].tunnelID = id;
      }
      this.#shouldReassignTunnelIDs = false;
    }

    // Steers the agent through one tunnel; returns true when it passed the last
    // point (Carbon ProcessTunnel, cpp:220-299). Mutates data.tunnelPoint and
    // this.#desiredVector.
    #ProcessTunnel(agent, tunnel, data, boundingSphere) {
      const points = tunnel.splinePoints;
      if (points.length === 0) {
        return false;
      }

      // if we've reached the end of the tunnel
      if (data.tunnelPoint === points.length) {
        return true;
      }
      const pointID = data.tunnelPoint;
      const point = points[pointID];
      if (!point) {
        return false;
      }
      vec3.subtract(TARGET_VECTOR, point.pos, agent.position);

      // Carbon compares against *begin()/*end() by value; the intent is the
      // first/last spline point.
      if (pointID === 0) {
        vec3.copy(VECTOR_BETWEEN, point.rot);
      } else {
        vec3.copy(VECTOR_BETWEEN, points[pointID - 1].rot);
      }
      const lengthBetweenPoints = vec3.length(VECTOR_BETWEEN);
      if (lengthBetweenPoints !== 0) {
        const dotProd = vec3.dot(TARGET_VECTOR, VECTOR_BETWEEN);
        vec3.scale(VECTOR_PROJ, VECTOR_BETWEEN, dotProd / (lengthBetweenPoints * lengthBetweenPoints));
        vec3.subtract(OFFSET, VECTOR_PROJ, TARGET_VECTOR);
        vec3.normalize(OFFSET, OFFSET);
        vec3.scale(OFFSET, OFFSET, tunnel.cylWidth / 2);

        // add a random offset so drones wander around the tunnel while seeking
        // the next point (Carbon cpp:253-257, uniform in +-cylWidth*wander)
        const wanderSpan = tunnel.cylWidth * this.wanderAmount;
        for (let i = 0; i < 3; i++) {
          OFFSET[i] += -wanderSpan + Math.random() * 2 * wanderSpan;
        }
        vec3.add(TARGET_VECTOR, TARGET_VECTOR, OFFSET);
      }
      if (pointID === points.length - 1) {
        vec3.copy(this.#desiredVector, point.rot);

        // the Dot product is positive if the agent is facing the target point
        if (vec3.dot(TARGET_VECTOR, agent.rotation) < 0 || vec3.length(TARGET_VECTOR) > 2 * lengthBetweenPoints) {
          return true;
        }
      } else {
        const lengthFromShip = vec3.length(TARGET_VECTOR);
        let blendingMod = 0;
        if (lengthBetweenPoints !== 0) {
          blendingMod = Math.min(1, Math.max(0, (lengthBetweenPoints - lengthFromShip) / lengthBetweenPoints));
          blendingMod = blendingMod * blendingMod;
        }
        vec3.normalize(TARGET_NORMALIZED, TARGET_VECTOR);
        vec3.add(BLEND_VECTOR, point.rot, TARGET_VECTOR);
        vec3.normalize(BLEND_VECTOR, BLEND_VECTOR);
        vec3.scale(this.#desiredVector, TARGET_NORMALIZED, 0.8 * (1 - blendingMod));
        vec3.scaleAndAdd(this.#desiredVector, this.#desiredVector, BLEND_VECTOR, (1 - 0.8) * blendingMod);
        vec3.normalize(DESIRED_NORMALIZED, this.#desiredVector);
        if (vec3.dot(TARGET_NORMALIZED, DESIRED_NORMALIZED) < 0.8) {
          vec3.copy(this.#desiredVector, TARGET_VECTOR);
        }
        if (lengthFromShip - boundingSphere < tunnel.cylWidth / 1.5) {
          data.tunnelPoint++;
        }
      }
      return false;
    }

    // Assigns the exit tunnel whose entry point is closest to the agent (Carbon
    // FindAndAssignAnExitTunnel, cpp:301-327).
    #FindAndAssignAnExitTunnel(agent, data) {
      let closestPointIndex = -1;
      let lengthSqToClosestPoint = -1;
      let index = 0;
      for (const tunnel of this.#privateTunnels) {
        if (tunnel.tunnelGroupType === TunnelGroupType.EXIT_TUNNELS && tunnel.splinePoints.length !== 0) {
          vec3.subtract(TARGET_VECTOR, tunnel.splinePoints[0].pos, agent.position);
          const lengthSq = vec3.squaredLength(TARGET_VECTOR);
          if (lengthSqToClosestPoint === -1 || lengthSq < lengthSqToClosestPoint) {
            lengthSqToClosestPoint = lengthSq;
            closestPointIndex = index;
          }
        }
        index++;
      }
      if (closestPointIndex !== -1) {
        data.assignedLifeTimeTunnel = closestPointIndex;
      } else {
        data.hasUsedExitTunnel = true;
      }
    }

    // Places the very first spawn somewhere along a random entrance tunnel's
    // curve (Carbon FindInitialSpawnPoint, cpp:329-388).
    #FindInitialSpawnPoint(drone, data, pos, systemTunnels) {
      // if we have local tunnels use them, otherwise use system-wide ones
      let tunnels;
      if (this.splineTunnels.length !== 0) {
        tunnels = this.splineTunnels;
      } else if (systemTunnels.length !== 0) {
        tunnels = systemTunnels;
      } else {
        return false;
      }

      // pick a random splineTunnel
      const splineTunnel = tunnels[Math.floor(Math.random() * tunnels.length)];
      const curveSets = splineTunnel?.GetCurveSets?.() ?? splineTunnel?.curveSets ?? [];

      // return early if there are no curves or the curves aren't loaded
      if (curveSets.length === 0) {
        return false;
      }
      const groupType = splineTunnel.GetTunnelGroupType?.() ?? splineTunnel.tunnelGroupType;
      if (groupType === TunnelGroupType.ENTRANCE_TUNNELS) {
        // we can have more than 1 curve so pick a random curve
        const curve = curveSets[Math.floor(Math.random() * curveSets.length)];
        if (!curve?.Length || !curve?.GetValue) {
          return false;
        }

        // get random time
        const length = Math.trunc(Number(curve.Length()) || 0);
        const time = Math.floor(Math.random() * (length + 1));

        // get value at time
        const value = curve.GetValue(time, pos);
        if (value && value !== pos) {
          vec3.copy(pos, value);
        }
        const stepSize = length !== 0 ? time / length : 0;

        // Get the next pointID
        const breakPoints = Number(splineTunnel.GetNumBreakPoints?.() ?? splineTunnel.breakPoints ?? 0);
        const pointID = Math.floor(stepSize * breakPoints + 1) + 0.5;
        vec3.copy(drone.position, pos);
        drone.lifetime += stepSize * pointID;
        data.tunnelPoint = Math.trunc(pointID);
        return true;
      }
      return false;
    }

    // Picks a jittered entrance point for a respawning drone and assigns it the
    // matching tunnel (Carbon FindASpawnPoint, cpp:390-426). The candidate
    // lists are allocated here - a respawn event, not the steady per-frame path.
    #FindASpawnPoint(agent, data, group) {
      const potentialPoints = [];
      const potentialRotations = [];
      const tunnelIndex = [];
      for (const tunnel of this.#privateTunnels) {
        if (tunnel.tunnelGroupType === TunnelGroupType.ENTRANCE_TUNNELS && tunnel.splinePoints.length !== 0) {
          const point = vec3.clone(tunnel.splinePoints[0].pos);
          for (let i = 0; i < 3; i++) {
            point[i] += -tunnel.pointOfNoReturnSize + Math.random() * 2 * tunnel.pointOfNoReturnSize;
          }
          potentialPoints.push(point);
          potentialRotations.push(tunnel.splinePoints[0].rot);
          tunnelIndex.push(tunnel.tunnelID);
        }
      }
      if (potentialPoints.length === 0) {
        return;
      }
      const randomNbr = Math.floor(Math.random() * potentialPoints.length);
      vec3.copy(group.spawnPosition, potentialPoints[randomNbr]);
      vec3.copy(agent.position, potentialPoints[randomNbr]);
      vec3.normalize(SPAWN_ROTATION, potentialRotations[randomNbr]);
      if (vec3.squaredLength(SPAWN_ROTATION) > 0) {
        quat.rotationTo(agent.rotation, Z_AXIS, SPAWN_ROTATION);
      }
      data.assignedLifeTimeTunnel = tunnelIndex[randomNbr];
    }
    #WireTunnelGroups() {
      this.#tunnelGroupSnapshot = this.splineTunnels.slice();
      for (const group of this.splineTunnels) {
        group?.SetSystemTunnelFunctionReferenceAndColor?.(() => this.UpdateTunnelRegistry(), 0xff5555aa);
      }
    }
    #TunnelGroupsMatchSnapshot() {
      return this.#tunnelGroupSnapshot.length === this.splineTunnels.length && this.#tunnelGroupSnapshot.every((group, index) => group === this.splineTunnels[index]);
    }
  }];
  ProcessPriority = ProcessPriority;
  constructor() {
    super(_ProcessLifetime), _initClass();
  }
}();

export { _ProcessLifetime as ProcessLifetime };
//# sourceMappingURL=ProcessLifetime.js.map
