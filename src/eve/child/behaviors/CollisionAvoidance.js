// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Eve/SpaceObject/Children/Behaviors/CollisionAvoidance.h
//   trinity/trinity/Eve/SpaceObject/Children/Behaviors/CollisionAvoidance.cpp
import { carbon, impl, io, schema, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { ProcessPriority } from "./enums.js";

// Module scratch for the per-agent loop (behavior updates run sequentially).
const FROM_TARGET = vec3.create();
const NO_FORCES = [];

/**
 * Drone behavior that pushes agents away from the centre of every exclusion
 * volume they intersect, weighted by the volume's intensity at the agent.
 */
@type.define({ className: "CollisionAvoidance", family: "eve/child/behaviors" })
export class CollisionAvoidance extends CjsModel
{

  static ProcessPriority = ProcessPriority;

  /** m_priority (int32_t) [READWRITE, PERSIST, NOTIFY, ENUM] */
  @io.notify
  @io.persist
  @type.int32
  @schema.enum("ProcessPriority")
  behaviorPriority = 0;

  /** m_exclusionVolumes (PIEveVolumeVector) [READ, PERSIST] */
  @io.persist
  @type.list("IEveVolume")
  exclusionVolumes = [];

  /** m_collisionAvoidanceScalar (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  avoidanceScalar = 12;

  /** m_enabled (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  enabled = true;

  // Per-frame cache of the exclusion volume centres, prefetched so the
  // per-agent loop stays allocation-free.
  #volumeCenters = [];

  /** Carbon CollisionAvoidance::GetProcessPriority (cpp:18-21). */
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.implemented
  CalculateBehavior(agents, _scratchData, _deltaTime, _group, _system, _dronesInSearchRadius)
  {
    if (!this.enabled)
    {
      return NO_FORCES;
    }

    const centers = this.#volumeCenters;
    centers.length = 0;
    for (const volume of this.exclusionVolumes)
    {
      centers.push(volume?.GetBoundingSphere?.()?.center ?? null);
    }

    for (const agent of agents)
    {
      for (let i = 0; i < this.exclusionVolumes.length; i++)
      {
        const intensity = Number(this.exclusionVolumes[i]?.GetIntensity?.(agent.position) ?? 0);
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

  /** Adds Carbon's exclusion-volume debug option. */
  @carbon.method
  @impl.adapted
  @impl.reason("Tr2DebugRendererOptions is represented by an injected Set-like option bag.")
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

  /** Delegates exclusion-volume debug geometry when its option is enabled. */
  @carbon.method
  @impl.adapted
  @impl.reason("ITr2DebugRenderer2 is an injected engine-owned capability.")
  RenderDebugInfo(renderer, _agents, parentWorldLocation)
  {
    if (!renderer?.HasOption?.(this, "ExclusionVolumes"))
    {
      return;
    }
    for (const volume of this.exclusionVolumes)
    {
      volume?.RenderDebugInfo?.(renderer, parentWorldLocation);
    }
  }

}
