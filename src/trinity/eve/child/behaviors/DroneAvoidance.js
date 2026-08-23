// Source: trinity/trinity/Eve/SpaceObject/Children/Behaviors/DroneAvoidance.h
//   trinity/trinity/Eve/SpaceObject/Children/Behaviors/DroneAvoidance.cpp
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "#schema";
import { CjsModel } from "#model";
import { vec3 } from "#math/vec3";

// Module scratch for the per-agent loop (behavior updates run sequentially).
const AVOIDANCE_DIRECTION = vec3.create();
const VELOCITY_NORMALIZED = vec3.create();
const FORCE_OFFSET = vec3.create();
const NO_FORCES = [];

/** A steering behaviour that pushes each drone away from its nearby neighbours, blended with its current velocity direction, to keep agents from clustering or overlapping. */
@type.define({ className: "DroneAvoidance", family: "eve/child/behaviors" })
export class DroneAvoidance extends CjsModel
{

  /** m_priority (int32_t) [READWRITE, PERSIST, NOTIFY, ENUM] */
  @io.notify
  @io.persist
  @type.int32
  behaviorPriority = 0;

  /** m_behaviorWeight (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  behaviorWeight = 300;

  /** m_visionRange (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  visionRange = 5;

  /** m_enabled (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  enabled = true;

  /** m_framesBetweenUpdates (int32_t) [READWRITE, PERSIST] */
  @io.persist
  @type.int32
  framesBetweenUpdates = 3;

  // Carbon m_frameCounter/m_lastPullForces runtime state.
  #frameCounter = 0;

  #lastPullForces = [];

  #returnForces = [];

  /** Carbon DroneAvoidance::GetProcessPriority (cpp:22-25). */
  @carbon.method
  @impl.implemented
  GetProcessPriority()
  {
    return this.behaviorPriority;
  }

  /**
   * Pushes each agent away from close neighbours, blended with its current
   * velocity direction, on refresh frames; replays the cached forces in
   * between (Carbon CalculateBehavior, cpp:27-130).
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
        const pullForce = this.#PullForceAt(c);

        if (dronesInSearchRadius.length <= c)
        {
          vec3.set(pullForce, 0, 0, 0);
          c++;
          continue;
        }

        if (dronesInSearchRadius.length === 0)
        {
          vec3.set(pullForce, 0, 0, 0);
          this.#lastPullForces.length = c + 1;
          return returnForces;
        }

        const neighbours = dronesInSearchRadius[c];
        c++;

        if (neighbours.length === 0 || neighbours.length === 1)
        {
          vec3.set(pullForce, 0, 0, 0);
          continue;
        }

        vec3.set(AVOIDANCE_DIRECTION, 0, 0, 0);
        for (const other of neighbours)
        {
          if (other.id === agent.id)
          {
            continue;
          }

          AVOIDANCE_DIRECTION[0] += agent.position[0] - other.position[0];
          AVOIDANCE_DIRECTION[1] += agent.position[1] - other.position[1];
          AVOIDANCE_DIRECTION[2] += agent.position[2] - other.position[2];
        }

        if (vec3.squaredLength(AVOIDANCE_DIRECTION) === 0)
        {
          vec3.set(pullForce, 0, 0, 0);
          continue;
        }

        vec3.normalize(AVOIDANCE_DIRECTION, AVOIDANCE_DIRECTION);
        vec3.normalize(VELOCITY_NORMALIZED, agent.velocity);
        vec3.scale(pullForce, AVOIDANCE_DIRECTION, 0.5);
        vec3.scaleAndAdd(pullForce, pullForce, VELOCITY_NORMALIZED, 0.5);
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

  /** Carbon DroneAvoidance::GetBehaviorSearchRadius (cpp:132-144). */
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
