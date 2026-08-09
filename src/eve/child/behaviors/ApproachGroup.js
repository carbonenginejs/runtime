// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Eve/SpaceObject/Children/Behaviors/ApproachGroup.h
//   trinity/trinity/Eve/SpaceObject/Children/Behaviors/ApproachGroup.cpp
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";

// Module scratch for the per-agent loop (behavior updates run sequentially).
const MIDDLE_POINT = vec3.create();
const FORCE_OFFSET = vec3.create();
const NO_FORCES = [];

/** A steering behaviour that pulls each drone toward the centroid of its nearby neighbours, recomputing the pull force on a throttled schedule and reusing it between refreshes. */
@type.define({ className: "ApproachGroup", family: "eve/child/behaviors" })
export class ApproachGroup extends CjsModel
{

  /** m_priority (int32_t) [READWRITE, PERSIST, NOTIFY, ENUM] */
  @io.notify
  @io.persist
  @type.int32
  behaviorPriority = 0;

  /** m_behaviorWeight (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  behaviorWeight = 60;

  /** m_visionRange (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  visionRange = 150;

  /** m_enabled (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  enabled = true;

  /** m_framesBetweenUpdates (int32_t) [READWRITE, PERSIST] */
  @io.persist
  @type.int32
  framesBetweenUpdates = 83;

  // Carbon m_frameCounter/m_lastPullForces runtime state.
  #frameCounter = 0;

  #lastPullForces = [];

  #returnForces = [];

  /** Carbon ApproachGroup::GetProcessPriority (cpp:22-25). */
  @carbon.method
  @impl.implemented
  GetProcessPriority()
  {
    return this.behaviorPriority;
  }

  /**
   * Pulls each agent toward the centroid of its neighbourhood on refresh
   * frames and replays the cached pull forces in between (Carbon
   * CalculateBehavior, cpp:27-106).
   * @param {Array} agents - DroneAgent records
   * @param {Array|null} _scratchData - unused (no scratch)
   * @param {Number} _deltaTime
   * @param {Object} group - owning BehaviorGroup
   * @param {Object} _system - owning EveChildBehaviorSystem
   * @param {Array} dronesInSearchRadius - per-agent neighbour lists
   * @returns {Array} debug force pairs when group.collectForces is on
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Debug force pairs are only collected when group.collectForces is set, keeping the per-agent loop allocation-free.")
  CalculateBehavior(agents, _scratchData, _deltaTime, group, _system, dronesInSearchRadius)
  {
    if (!this.enabled)
    {
      return NO_FORCES;
    }

    const returnForces = this.#returnForces;
    returnForces.length = 0;

    if (this.#frameCounter === 0)
    {
      let c = 0;
      for (const agent of agents)
      {
        const neighbours = dronesInSearchRadius[c] ?? NO_FORCES;
        const pullForce = this.#PullForceAt(c);
        c++;
        if (neighbours.length === 0)
        {
          vec3.set(pullForce, 0, 0, 0);
          continue;
        }

        vec3.set(MIDDLE_POINT, 0, 0, 0);
        for (const other of neighbours)
        {
          vec3.add(MIDDLE_POINT, MIDDLE_POINT, other.position);
        }
        vec3.scale(MIDDLE_POINT, MIDDLE_POINT, 1 / neighbours.length);

        vec3.subtract(MIDDLE_POINT, MIDDLE_POINT, agent.position);
        if (vec3.squaredLength(MIDDLE_POINT) === 0)
        {
          vec3.set(pullForce, 0, 0, 0);
          continue;
        }

        vec3.normalize(pullForce, MIDDLE_POINT);
        vec3.scale(pullForce, pullForce, this.behaviorWeight);

        if (vec3.squaredLength(pullForce) > 0)
        {
          vec3.add(agent.acceleration, agent.acceleration, pullForce);
        }
        else
        {
          vec3.set(pullForce, 0, 0, 0);
        }

        if (group.collectForces)
        {
          vec3.normalize(FORCE_OFFSET, pullForce);
          vec3.scale(FORCE_OFFSET, FORCE_OFFSET, group.GetBoundingSphereRadius());
          returnForces.push(vec3.add(vec3.create(), agent.position, FORCE_OFFSET));
          returnForces.push(vec3.clone(pullForce));
        }
      }
      this.#lastPullForces.length = c;
    }
    else
    {
      if (this.#lastPullForces.length === 0)
      {
        return returnForces;
      }

      let c = 0;
      for (const agent of agents)
      {
        if (c >= this.#lastPullForces.length)
        {
          break;
        }

        const pullForce = this.#lastPullForces[c];
        vec3.add(agent.acceleration, agent.acceleration, pullForce);

        if (group.collectForces && vec3.squaredLength(pullForce) > 0)
        {
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

  /** Carbon ApproachGroup::GetBehaviorSearchRadius (cpp:108-120). */
  @carbon.method
  @impl.implemented
  GetBehaviorSearchRadius()
  {
    if (this.#frameCounter >= this.framesBetweenUpdates)
    {
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
  #PullForceAt(index)
  {
    let force = this.#lastPullForces[index];
    if (!force)
    {
      force = vec3.create();
      this.#lastPullForces[index] = force;
    }
    return force;
  }

}
