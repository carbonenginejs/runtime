import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/SpaceObject/Children/Behaviors/ApproachGroup.h
//   trinity/trinity/Eve/SpaceObject/Children/Behaviors/ApproachGroup.cpp
// Hand-maintained from Carbon source, promoted out of generated intake.
import { IBehavior } from "./IBehavior.js";
import { meta, type, blue } from "#schema";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { color } from "#math/color";
import { ITr2DebugRenderer2, Tr2DebugColor, Tr2DebugObjectReference } from "#interfaces";

// Module scratch for the per-agent loop (behavior updates run sequentially).
const MIDDLE_POINT = vec3.create();
const FORCE_OFFSET = vec3.create();
const NO_FORCES = [];

// Debug-draw scratch (debug drawing runs sequentially).
const DEBUG_TRANSFORM = mat4.create();
const DEBUG_NEAR_COLOR = color.fromARGB(color.create(), 0xffffffff);
const DEBUG_FAR_COLOR = color.fromARGB(color.create(), 0xff1111ff);
const DEBUG_COLOR = color.create();

/** A steering behaviour that pulls each drone toward the centroid of its nearby neighbours, recomputing the pull force on a throttled schedule and reusing it between refreshes. */
@be.define("ApproachGroup")
@blue.inherit(IBehavior)
@be.mapInterface(IBehavior)
export class ApproachGroup
{

  /** m_priority (int32_t) [READWRITE, PERSIST, NOTIFY, ENUM] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.int32
  @type.enum("trinity.IBehavior.ProcessPriority")
  behaviorPriority = 0;

  /** m_behaviorWeight (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  behaviorWeight = 60;

  /** m_visionRange (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  visionRange = 150;

  /** m_enabled (bool) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  enabled = true;

  /** m_framesBetweenUpdates (int32_t) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.int32
  framesBetweenUpdates = 83;

  // Carbon m_frameCounter/m_lastPullForces runtime state.
  _frameCounter = 0;

  _lastPullForces = [];

  _returnForces = [];

  /** Carbon ApproachGroup::GetProcessPriority (cpp:22-25). */
  @blue.method
  @meta.implemented
  GetProcessPriority()
  {
    return this.behaviorPriority;
  }

  /**
   * Pulls each agent toward the centroid of its neighbourhood on refresh
   * frames and replays the cached pull forces in between (Carbon
   * CalculateBehavior, cpp:27-106).
   *
   * Adapted: Debug force pairs are only collected when group.collectForces is set, keeping
   * the per-agent loop allocation-free.
   *
   * @param {Array} agents - DroneAgent records
   * @param {Array|null} _scratchData - unused (no scratch)
   * @param {Number} _deltaTime
   * @param {Object} group - owning BehaviorGroup
   * @param {Object} _system - owning EveChildBehaviorSystem
   * @param {Array} dronesInSearchRadius - per-agent neighbour lists
   * @returns {Array} debug force pairs when group.collectForces is on
   */
  @blue.method
  @meta.adapted
  CalculateBehavior(agents, _scratchData, _deltaTime, group, _system, dronesInSearchRadius)
  {
    if (!this.enabled)
    {
      return NO_FORCES;
    }

    const returnForces = this._returnForces;
    returnForces.length = 0;

    if (this._frameCounter === 0)
    {
      let c = 0;
      for (const agent of agents)
      {
        const neighbours = dronesInSearchRadius[c] ?? NO_FORCES;
        const pullForce = this._PullForceAt(c);
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
      this._lastPullForces.length = c;
    }
    else
    {
      if (this._lastPullForces.length === 0)
      {
        return returnForces;
      }

      let c = 0;
      for (const agent of agents)
      {
        if (c >= this._lastPullForces.length)
        {
          break;
        }

        const pullForce = this._lastPullForces[c];
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
  @blue.method
  @meta.implemented
  GetBehaviorSearchRadius()
  {
    if (this._frameCounter >= this.framesBetweenUpdates)
    {
      this._frameCounter = 0;
      return this.visionRange;
    }
    this._frameCounter++;
    return -1;
  }

  /**
   * Carbon ApproachGroup::GetDebugOptions (cpp:122-125).
   * @param {Set<string>} options The caller-owned option set.
   */
  @blue.method
  @meta.implemented
  GetDebugOptions(options)
  {
    options.add("BehaviorVisionRanges");
  }

  /**
   * Carbon ApproachGroup::RenderDebugInfo (cpp:127-140): a vision-range
   * sphere around every agent, tinted from white toward blue (ARGB 0xff1111ff) as the range
   * approaches 1500.
   * @param {ITr2DebugRenderer2} renderer
   * @param {Array} agents DroneAgent records.
   * @param {mat4} parentWorldLocation Places the agents in world space.
   */
  @blue.method
  @meta.implemented
  RenderDebugInfo(renderer, agents, parentWorldLocation)
  {
    if (renderer.HasOption(this, "BehaviorVisionRanges"))
    {
      if (this.visionRange <= 0)
      {
        return;
      }

      const lengthLerp = Math.min(1, Math.max(0, this.visionRange / 1500));
      for (const agent of agents)
      {
        // Carbon Lerp( Color( 0xffffffff ), Color( 0xff1111ff ), lengthLerp ), componentwise.
        color.lerp(DEBUG_COLOR, DEBUG_NEAR_COLOR, DEBUG_FAR_COLOR, lengthLerp);

        // Carbon (row-vector): TranslationMatrix( agent->position ) * parentWorldLocation.
        mat4.translate(DEBUG_TRANSFORM, parentWorldLocation, agent.position);
        renderer.DrawSphere__TransformRadius(Tr2DebugObjectReference.create__Object(this), DEBUG_TRANSFORM, this.visionRange, 6, ITr2DebugRenderer2.Effect.Wireframe, Tr2DebugColor.create__Color(DEBUG_COLOR));
      }
    }
  }

  // Reuses (or grows) the cached pull-force slot for one agent index.
  /**
   * The cached pull-force vector for an agent index, created on first use.
   */
  _PullForceAt(index)
  {
    let force = this._lastPullForces[index];
    if (!force)
    {
      force = vec3.create();
      this._lastPullForces[index] = force;
    }
    return force;
  }

}
