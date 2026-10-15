// Source: trinity/trinity/Eve/SpaceObject/Children/Behaviors/CollisionAvoidance.h
//   trinity/trinity/Eve/SpaceObject/Children/Behaviors/CollisionAvoidance.cpp
import { IBehavior } from "./IBehavior.js";
import { meta, type, blue } from "#schema";
import { vec3 } from "#math/vec3";
import { ProcessPriority } from "./enums.js";

// Module scratch for the per-agent loop (behavior updates run sequentially).
const FROM_TARGET = vec3.create();
const NO_FORCES = [];

/**
 * Drone behavior that pushes agents away from the centre of every exclusion
 * volume they intersect, weighted by the volume's intensity at the agent.
 */
@blue.define("CollisionAvoidance")
@blue.inherit(IBehavior)
@blue.interface(IBehavior)
export class CollisionAvoidance
{

  static ProcessPriority = ProcessPriority;

  /** m_priority (int32_t) [READWRITE, PERSIST, NOTIFY, ENUM] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.int32
  @type.enum("trinity.IBehavior.ProcessPriority")
  behaviorPriority = 0;

  /** m_exclusionVolumes (PIEveVolumeVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("IEveVolume")
  exclusionVolumes = [];

  /** m_collisionAvoidanceScalar (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  avoidanceScalar = 12;

  /** m_enabled (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  enabled = true;

  // Per-frame cache of the exclusion volume centres, prefetched so the
  // per-agent loop stays allocation-free.
  _volumeCenters = [];

  /** Carbon CollisionAvoidance::GetProcessPriority (cpp:18-21). */
  @blue.method
  @meta.implemented
  GetProcessPriority()
  {
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
  @blue.method
  @meta.implemented
  CalculateBehavior(agents, _scratchData, _deltaTime, _group, _system, _dronesInSearchRadius)
  {
    if (!this.enabled)
    {
      return NO_FORCES;
    }

    const centers = this._volumeCenters;
    centers.length = 0;
    for (const volume of this.exclusionVolumes)
    {
      centers.push(volume.GetBoundingSphere().center);
    }

    for (const agent of agents)
    {
      for (let i = 0; i < this.exclusionVolumes.length; i++)
      {
        const intensity = Number(this.exclusionVolumes[i].GetIntensity(agent.position));
        // we only want to continue if we are inside the outer radius
        if (intensity > 0 && centers[i])
        {
          // get the direction AWAY from the center of the exclusion volume
          vec3.subtract(FROM_TARGET, agent.position, centers[i]);
          vec3.scaleAndAdd(agent.acceleration, agent.acceleration, FROM_TARGET, intensity * this.avoidanceScalar);
        }
      }
    }
    return NO_FORCES;
  }

  /**
   * Adds Carbon's exclusion-volume debug option.
   *
   * Adapted: Adds option strings through the supplied collection's add or insert method; the
   * debug adapter retains its capability checks.
   */
  @blue.method
  @meta.adapted
  GetDebugOptions(options = new Set())
  {
    if (options?.add)
    {
      options.add("ExclusionVolumes");
    }
    else
    {
      options?.insert?.("ExclusionVolumes");
    }
    return options;
  }

  /**
   * Delegates exclusion-volume debug geometry when its option is enabled.
   *
   * Adapted: ITr2DebugRenderer2 is an injected engine-owned capability.
   */
  @blue.method
  @meta.adapted
  RenderDebugInfo(renderer, _agents, parentWorldLocation)
  {
    if (!renderer?.HasOption?.(this, "ExclusionVolumes"))
    {
      return;
    }
    for (const volume of this.exclusionVolumes)
    {
      volume.RenderDebugInfo(renderer, parentWorldLocation);
    }
  }

}
