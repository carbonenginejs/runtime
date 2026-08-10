import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { type, io, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { TunnelGroupType } from './enums.js';

let _initProto, _initClass, _init_privateTunnels, _init_extra_privateTunnels, _init_shouldReassignTunnelIDs, _init_extra_shouldReassignTunnelIDs, _init_behaviorPriority, _init_extra_behaviorPriority, _init_tunnelGroupType, _init_extra_tunnelGroupType, _init_splineTunnels, _init_extra_splineTunnels, _init_smoothPullFactor, _init_extra_smoothPullFactor, _init_behaviorWeight, _init_extra_behaviorWeight, _init_enabled, _init_extra_enabled, _init_cornerSmoothener, _init_extra_cornerSmoothener;

// Module scratch for the per-agent loop (behavior updates run sequentially).
const DIST = vec3.create();
const TARGET_VECTOR = vec3.create();
const VECTOR_BETWEEN = vec3.create();
const VECTOR_PROJ = vec3.create();
const OFFSET = vec3.create();
const TARGET_NORMALIZED = vec3.create();
const BLEND_VECTOR = vec3.create();
const DESIRED_NORMALIZED = vec3.create();
const PULL_FORCE = vec3.create();
const FORCE_OFFSET = vec3.create();
const NO_FORCES = [];

/** A steering behaviour that pulls unassigned drones into spline tunnel entrances and steers locked drones along their assigned tunnel's points toward the exit. */
let _FollowASpline;
new class extends _identity {
  static [class FollowASpline extends CjsModel {
    static {
      ({
        e: [_init_privateTunnels, _init_extra_privateTunnels, _init_shouldReassignTunnelIDs, _init_extra_shouldReassignTunnelIDs, _init_behaviorPriority, _init_extra_behaviorPriority, _init_tunnelGroupType, _init_extra_tunnelGroupType, _init_splineTunnels, _init_extra_splineTunnels, _init_smoothPullFactor, _init_extra_smoothPullFactor, _init_behaviorWeight, _init_extra_behaviorWeight, _init_enabled, _init_extra_enabled, _init_cornerSmoothener, _init_extra_cornerSmoothener, _initProto],
        c: [_FollowASpline, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "FollowASpline",
        family: "eve/child/behaviors"
      })], [[type.list("SplineTunnel"), 0, "privateTunnels"], [[type, type.boolean], 16, "shouldReassignTunnelIDs"], [[io, io.notify, io, io.persist, type, type.int32], 16, "behaviorPriority"], [[io, io.persist, type, type.int32, void 0, type.enum("TunnelGroupType")], 16, "tunnelGroupType"], [[io, io.persist, void 0, type.list("SplineTunnelGroup")], 16, "splineTunnels"], [[io, io.persist, type, type.float32], 16, "smoothPullFactor"], [[io, io.persist, type, type.float32], 16, "behaviorWeight"], [[io, io.persist, type, type.boolean], 16, "enabled"], [[io, io.persist, type, type.float32], 16, "cornerSmoothener"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetProcessPriority"], [[carbon, carbon.method, impl, impl.implemented], 18, "OnModified"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon returns a byte size; the JS port models scratch as one plain record per agent, so any non-zero value means 'has scratch'.")], 18, "GetScratchMemorySize"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon initializes caller-provided raw memory; the JS port returns the fresh record instead.")], 18, "InitializeScratch"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Debug force pairs are only collected when group.collectForces is set, keeping the per-agent loop allocation-free.")], 18, "CalculateBehavior"], [[carbon, carbon.method, impl, impl.adapted], 18, "remapTunnels"]], 0, void 0, CjsModel));
    }
    /** Flattened CPU tunnel references used by the behavior system. */
    privateTunnels = (_initProto(this), _init_privateTunnels(this, []));
    shouldReassignTunnelIDs = (_init_extra_privateTunnels(this), _init_shouldReassignTunnelIDs(this, true));

    /** m_priority (int32_t) [READWRITE, PERSIST, NOTIFY, ENUM] */
    behaviorPriority = (_init_extra_shouldReassignTunnelIDs(this), _init_behaviorPriority(this, 0));

    /** m_tunnelGroupType (TunnelGroupType - enum TunnelGroupType) [READWRITE, PERSIST, ENUM] */
    tunnelGroupType = (_init_extra_behaviorPriority(this), _init_tunnelGroupType(this, 2));

    /** m_splineTunnels (PSplineTunnelGroupVector) [READ, PERSIST] */
    splineTunnels = (_init_extra_tunnelGroupType(this), _init_splineTunnels(this, []));

    /** m_smoothPullFactor (float) [READWRITE, PERSIST] */
    smoothPullFactor = (_init_extra_splineTunnels(this), _init_smoothPullFactor(this, 0.8));

    /** m_behaviorWeight (float) [READWRITE, PERSIST] */
    behaviorWeight = (_init_extra_smoothPullFactor(this), _init_behaviorWeight(this, 600));

    /** m_enabled (bool) [READWRITE, PERSIST] */
    enabled = (_init_extra_behaviorWeight(this), _init_enabled(this, true));

    /** m_cornerSmoothener (float) [READWRITE, PERSIST] */
    cornerSmoothener = (_init_extra_enabled(this), _init_cornerSmoothener(this, 0.8));

    // Carbon m_frameCounter/m_framesBetweenUpdates/m_lastPullForces/
    // m_targetPointVector/m_desiredVector runtime state.
    #frameCounter = (_init_extra_cornerSmoothener(this), 0);
    #framesBetweenUpdates = 11;
    #lastPullForces = [];
    #targetPointVector = [];
    #desiredVector = vec3.create();
    #returnForces = [];

    /** Carbon FollowASpline::GetProcessPriority (cpp:32-35). */
    GetProcessPriority() {
      return this.behaviorPriority;
    }

    /** Carbon FollowASpline::OnModified (cpp:26-30). */
    OnModified(_value = null) {
      this.remapTunnels();
      return true;
    }

    /** Per-agent scratch record count (Carbon sizeof(FollowASplineData)). */
    GetScratchMemorySize() {
      return 1;
    }

    /** Fresh per-agent scratch record (Carbon FollowASplineData placement init). */
    InitializeScratch() {
      return {
        tunnelLock: -1,
        tunnelPoint: 0
      };
    }

    /**
     * Pulls unassigned agents into tunnel entrances, steers locked agents along
     * their tunnel points, and replays cached pull forces on skip frames
     * (Carbon CalculateBehavior, cpp:201-293).
     * @param {Array} agents - DroneAgent records
     * @param {Array} scratchData - per-agent FollowASplineData records
     * @param {Number} _deltaTime
     * @param {Object} group - owning BehaviorGroup
     * @param {Object} system - owning EveChildBehaviorSystem
     * @param {Array} _dronesInSearchRadius - unused
     * @returns {Array} debug force pairs when group.collectForces is on
     */
    CalculateBehavior(agents, scratchData, _deltaTime, group, system, _dronesInSearchRadius) {
      if (!this.enabled) {
        return NO_FORCES;
      }
      if (this.#frameCounter >= this.#framesBetweenUpdates) {
        this.#frameCounter = 0;
      } else {
        this.#frameCounter++;
      }
      const forceVectors = this.#returnForces;
      forceVectors.length = 0;
      if (this.#frameCounter === 0) {
        if (this.shouldReassignTunnelIDs) {
          // JS has no Blue list notify, so the local tunnel list refreshes here
          // before the system tunnels are prepended (Carbon relies on
          // OnListModified having filled m_privateTunnels already).
          this.remapTunnels();
          this.#ReassignTunnelIDsAndAddSystemTunnels(system);
          group.InitializeGeometryResource(); // reset all agents
          return forceVectors;
        }
        this.#targetPointVector.length = 0;
        let pullCount = 0;
        for (let c = 0; c < agents.length; c++) {
          const drone = agents[c];
          const data = scratchData?.[c];
          if (!data) {
            continue;
          }
          vec3.set(this.#desiredVector, 0, 0, 0);
          let rampingForce = 1;
          if (data.tunnelLock === -1) {
            rampingForce = this.#ProcessTunnelEntrances(drone, this.privateTunnels, data);
          }

          // tunnelLock can change in ProcessTunnelEntrances so if->else is not
          // equivalent
          if (data.tunnelLock !== -1) {
            if (this.#ProcessAssignedTunnel(drone, this.privateTunnels, group, data)) {
              // If process returns true we update all the drones as a unit and
              // skip if they are in a Formation
              if (this.#CheckForAndUpdateFormation(agents, group, scratchData, data.tunnelLock, data.tunnelPoint)) {
                // all drones have been updated so we break
                break;
              }
            }
          }
          const pullForce = this.#PullForceAt(pullCount);
          pullCount++;
          if (vec3.squaredLength(this.#desiredVector) === 0) {
            vec3.set(pullForce, 0, 0, 0);
            continue;
          }
          vec3.normalize(PULL_FORCE, this.#desiredVector);
          if (group.collectForces) {
            vec3.scale(FORCE_OFFSET, PULL_FORCE, group.GetBoundingSphereRadius());
            forceVectors.push(vec3.add(vec3.create(), drone.position, FORCE_OFFSET));
          }
          vec3.scale(PULL_FORCE, PULL_FORCE, this.behaviorWeight * rampingForce);
          if (group.collectForces) {
            forceVectors.push(vec3.clone(PULL_FORCE));
          }
          vec3.add(drone.acceleration, drone.acceleration, PULL_FORCE);
          vec3.copy(pullForce, PULL_FORCE);
        }
        this.#lastPullForces.length = pullCount;
      } else {
        if (this.#lastPullForces.length === 0) {
          return forceVectors;
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
            forceVectors.push(vec3.add(vec3.create(), agent.position, FORCE_OFFSET));
            forceVectors.push(vec3.clone(pullForce));
          }
          c++;
        }
      }
      return forceVectors;
    }

    /** Carbon method remapTunnels -> UpdateTunnelRegistry (cpp:319-335). */
    remapTunnels() {
      this.privateTunnels.length = 0;
      for (const group of this.splineTunnels) {
        const tunnels = group?.GetTunnels?.() ?? group?.tunnels;
        if (Array.isArray(tunnels)) {
          this.privateTunnels.push(...tunnels);
        }
      }
      this.shouldReassignTunnelIDs = true;
      return this.privateTunnels;
    }

    // Prepends the system-wide tunnels and reassigns sequential IDs (Carbon
    // ReassignTunnelIDsAndAddSystemTunnels, cpp:337-370).
    /**
     * Prepends the system-wide tunnels to the private tunnel list and reassigns every tunnel a sequential identifier.
     */
    #ReassignTunnelIDsAndAddSystemTunnels(system) {
      const tunnels = system.GetTunnels?.() ?? [];
      for (const tunnel of tunnels) {
        this.privateTunnels.unshift(tunnel);
      }
      let id = 0;
      if (tunnels.length !== 0) {
        id = tunnels[tunnels.length - 1].tunnelID;
      }
      if (this.privateTunnels.length === 0) {
        this.shouldReassignTunnelIDs = false;
        return;
      }
      for (const tunnel of this.privateTunnels) {
        tunnel.tunnelID = id;
        id++;
      }
      this.shouldReassignTunnelIDs = false;
    }

    // Pull-in test against the tunnel entrance spheres (Carbon
    // ProcessTunnelEntrances, cpp:70-104). Returns the ramping force and may
    // lock the agent to a tunnel; mutates this.#desiredVector.
    /**
     * Tests an unassigned agent against each tunnel's entrance sphere, locking it to a tunnel once inside the point-of-no-return radius and otherwise building a pull force as it nears.
     */
    #ProcessTunnelEntrances(agent, tunnels, data) {
      // not associated with a tunnel
      for (const tunnel of tunnels) {
        if (tunnel.tunnelGroupType !== TunnelGroupType.OTHER_TUNNELS) {
          return 0;
        }
        if (tunnel.splinePoints.length === 0) {
          continue;
        }
        vec3.subtract(DIST, tunnel.splinePoints[0].pos, agent.position);
        const length = vec3.length(DIST);
        if (length < tunnel.pointOfNoReturnSize) {
          data.tunnelLock = tunnel.tunnelID;
          data.tunnelPoint = 0;
        } else if (length < tunnel.pullSize) {
          if (tunnel.pullSize === tunnel.pointOfNoReturnSize) {
            continue;
          }

          // normalize the distance between outer and inner spheres to increase
          // pull-strength
          let mod = (length - tunnel.pointOfNoReturnSize) / (tunnel.pullSize - tunnel.pointOfNoReturnSize);
          mod = 1 - Math.max(0, Math.min(mod, 1));
          vec3.copy(this.#desiredVector, DIST);
          return Math.min(1, Math.max(0, 1 - this.smoothPullFactor + this.smoothPullFactor * mod));
        }
      }
      return 1;
    }

    // Steers a locked agent along its tunnel (Carbon ProcessAssignedTunnel,
    // cpp:107-189). Returns true when the tunnel state advanced; mutates the
    // scratch record and this.#desiredVector.
    /**
     * Steers a locked agent toward its current spline point, blending toward the next for smooth cornering, and advances or releases the lock as it arrives or drifts away.
     */
    #ProcessAssignedTunnel(agent, tunnels, group, data) {
      if (data.tunnelLock > tunnels.length) {
        return false;
      }
      const tunnel = tunnels[data.tunnelLock];
      const points = tunnel?.splinePoints;
      if (!points || points.length === 0) {
        return false;
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
        // an offset is added to the target point so they don't all follow the
        // same line
        const dotProd = vec3.dot(TARGET_VECTOR, VECTOR_BETWEEN);
        vec3.scale(VECTOR_PROJ, VECTOR_BETWEEN, dotProd / (lengthBetweenPoints * lengthBetweenPoints));
        vec3.subtract(OFFSET, VECTOR_PROJ, TARGET_VECTOR);
        vec3.normalize(OFFSET, OFFSET);
        vec3.scaleAndAdd(TARGET_VECTOR, TARGET_VECTOR, OFFSET, tunnel.cylWidth / 2);
      }

      // Carbon records every target point for debug rendering; the JS port only
      // collects them in debug (collectForces) mode to keep the loop
      // allocation-free.
      if (group.collectForces) {
        this.#targetPointVector.push(vec3.add(vec3.create(), TARGET_VECTOR, agent.position));
      }
      if (pointID === points.length - 1) {
        vec3.copy(this.#desiredVector, point.rot);

        // the Dot product is positive if the agent is facing the target point
        if (vec3.dot(TARGET_VECTOR, agent.rotation) < 0) {
          data.tunnelLock = -1;
          data.tunnelPoint = 0;
          return true;
        }
      } else {
        const lengthFromShip = vec3.length(TARGET_VECTOR);
        let blendingMod = 0;
        if (lengthBetweenPoints !== 0) {
          blendingMod = Math.min(1, Math.max(0, (lengthBetweenPoints - lengthFromShip) / lengthBetweenPoints));
          blendingMod = blendingMod * blendingMod;
        }
        this.cornerSmoothener = Math.min(1, Math.max(0, this.cornerSmoothener));
        vec3.normalize(TARGET_NORMALIZED, TARGET_VECTOR);
        vec3.add(BLEND_VECTOR, point.rot, TARGET_VECTOR);
        vec3.normalize(BLEND_VECTOR, BLEND_VECTOR);
        vec3.scale(this.#desiredVector, TARGET_NORMALIZED, this.cornerSmoothener * (1 - blendingMod));
        vec3.scaleAndAdd(this.#desiredVector, this.#desiredVector, BLEND_VECTOR, (1 - this.cornerSmoothener) * blendingMod);
        vec3.normalize(DESIRED_NORMALIZED, this.#desiredVector);
        if (vec3.dot(TARGET_NORMALIZED, DESIRED_NORMALIZED) < this.cornerSmoothener) {
          vec3.copy(this.#desiredVector, TARGET_VECTOR);
        }
        if (lengthFromShip - group.GetBoundingSphereRadius() < tunnel.cylWidth / 1.5) {
          data.tunnelPoint++;
          return true;
        }

        // rework into cylinder collision
        if (lengthFromShip > group.GetBoundingSphereRadius() + lengthBetweenPoints * 1.5 && vec3.dot(TARGET_VECTOR, VECTOR_BETWEEN) < 0) {
          data.tunnelLock = -1;
          data.tunnelPoint = 0;
          return true;
        }
      }
      return false;
    }

    // When the group is in Formation, locks every drone to the same tunnel
    // point so they advance as a unit (Carbon CheckForAndUpdateFormation,
    // cpp:295-317).
    /**
     * Locks every agent to the same tunnel and tunnel point while the group's formation behaviour is active, so the group advances as a unit.
     */
    #CheckForAndUpdateFormation(agents, group, scratchData, tunnel, tunnelPoint) {
      const formation = group.GetBehaviorByName("Formation");
      if (formation && formation.InFormation?.()) {
        for (let c = 0; c < agents.length; c++) {
          const data = scratchData?.[c];
          if (data) {
            data.tunnelLock = tunnel;
            data.tunnelPoint = tunnelPoint;
          }
        }
        return true;
      }
      return false;
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
  }];
  TunnelGroupType = TunnelGroupType;
  constructor() {
    super(_FollowASpline), _initClass();
  }
}();

export { _FollowASpline as FollowASpline };
//# sourceMappingURL=FollowASpline.js.map
