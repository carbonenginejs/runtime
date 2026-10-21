import { IRoot } from "../../../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObject/Children/Behaviors/IBehavior.h:7-79
import { CjsSchema, meta, blue } from "#schema";
import { ProcessPriority } from "./enums.js";


/** Contract for a drone steering behavior run by a BehaviorGroup; every method but CalculateBehavior has Carbon's default. */
export class IBehavior
{
  /**
   * Per-agent scratch size, none by default (h:29-32). Adapted: scratch is one plain record per agent, so any non-zero
   * answer means "has scratch".
   * @returns {number}
   */
  GetScratchMemorySize()
  {
    return 0;
  }

  /**
   * Initializes one agent's scratch (h:34-36). Adapted: returns the fresh record; the default has none.
   * @returns {object|null}
   */
  InitializeScratch()
  {
    return null;
  }

  /**
   * The pass this behavior runs in (h:38-41).
   * @returns {number} A ProcessPriority.
   */
  GetProcessPriority()
  {
    return ProcessPriority.LEAST_PRIORITY;
  }

  /**
   * The name BehaviorGroup.GetBehaviorByName matches (h:43-46).
   * @returns {string}
   */
  GetBehaviorName()
  {
    return "unnamed";
  }

  /** Clears behavior state; used by Formation (h:49-51). */
  Reset()
  {
  }

  /**
   * Applies this behavior's force to each agent's acceleration and returns (position, force) pairs per agent (h:53-54).
   * @param {Array} _agents - DroneAgent records
   * @param {Array|null} _scratchData - this behavior's per-agent records
   * @param {number} _deltaTime
   * @param {object} _group - the owning BehaviorGroup
   * @param {object} _system - the owning EveChildBehaviorSystem
   * @param {Array} _dronesInSearchRadius - per-agent neighbours within the search radius
   * @returns {Array}
   */
  CalculateBehavior(_agents, _scratchData, _deltaTime, _group, _system, _dronesInSearchRadius) {}

  /** Debug-renderer options; none by default (h:57-59). */
  GetDebugOptions(_options)
  {
  }

  /** Debug drawing; nothing by default (h:60-62). */
  RenderDebugInfo(_renderer, _agents, _parentWorldLocation)
  {
  }

  /**
   * The neighbour search radius the group gathers for this behavior; -1 when it ignores other agents (h:64-69).
   * @returns {number}
   */
  GetBehaviorSearchRadius()
  {
    return -1;
  }

  /**
   * Lets another behavior switch this one on or off (h:71-74).
   * @param {boolean} _state
   */
  UpdateState(_state)
  {
  }
}

CjsSchema.decorateMethod(IBehavior, "CalculateBehavior", meta.abstract);

CjsSchema.decorateMethod(IBehavior, "GetScratchMemorySize", blue.method);
CjsSchema.decorateMethod(IBehavior, "InitializeScratch", blue.method);
CjsSchema.decorateMethod(IBehavior, "GetProcessPriority", blue.method);
CjsSchema.decorateMethod(IBehavior, "GetBehaviorName", blue.method);
CjsSchema.decorateMethod(IBehavior, "Reset", blue.method);
CjsSchema.decorateMethod(IBehavior, "CalculateBehavior", blue.method);
CjsSchema.decorateMethod(IBehavior, "GetDebugOptions", blue.method);
CjsSchema.decorateMethod(IBehavior, "RenderDebugInfo", blue.method);
CjsSchema.decorateMethod(IBehavior, "GetBehaviorSearchRadius", blue.method);
CjsSchema.decorateMethod(IBehavior, "UpdateState", blue.method);

CjsSchema.blue.inherit(IRoot)(IBehavior);
CjsSchema.exposure.interface("IBehavior")(IBehavior);
