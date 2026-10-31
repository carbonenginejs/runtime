import { IRoot } from "../../../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObject/Children/Behaviors/IBehavior.h:7-79
import { CjsSchema, meta } from "#schema";
import { ProcessPriority } from "./enums.js";


/** Contract for a drone steering behavior run by a BehaviorGroup; every method but CalculateBehavior has Carbon's default. */
export class IBehavior extends IRoot
{
  /**
   * Per-agent scratch size, none by default (h:29-32). Adapted: scratch is one plain record per agent, so any non-zero
   * answer means "has scratch".
   *
   * @implemented
   * @returns {number}
   */
  GetScratchMemorySize()
  {
    return 0;
  }

  /**
   * Initializes one agent's scratch (h:34-36). Adapted: returns the fresh record; the default has none.
   *
   * @implemented
   * @returns {object|null}
   */
  InitializeScratch()
  {
    return null;
  }

  /**
   * The pass this behavior runs in (h:38-41).
   *
   * @implemented
   * @returns {number} A ProcessPriority.
   */
  GetProcessPriority()
  {
    return ProcessPriority.LEAST_PRIORITY;
  }

  /**
   * The name BehaviorGroup.GetBehaviorByName matches (h:43-46).
   *
   * @implemented
   * @returns {string}
   */
  GetBehaviorName()
  {
    return "unnamed";
  }

  /**
   * Clears behavior state; used by Formation (h:49-51).
   *
   * @implemented
   */
  Reset()
  {
  }

  /**
   * Applies this behavior's force to each agent's acceleration and returns (position, force) pairs per agent (h:53-54).
   *
   * @abstract
   * @param {Array} _agents - DroneAgent records
   * @param {Array|null} _scratchData - this behavior's per-agent records
   * @param {number} _deltaTime
   * @param {object} _group - the owning BehaviorGroup
   * @param {object} _system - the owning EveChildBehaviorSystem
   * @param {Array} _dronesInSearchRadius - per-agent neighbours within the search radius
   * @returns {Array}
   */
  CalculateBehavior(_agents, _scratchData, _deltaTime, _group, _system, _dronesInSearchRadius) {}

  /**
   * Debug-renderer options; none by default (h:57-59).
   *
   * @implemented
   */
  GetDebugOptions(_options)
  {
  }

  /**
   * Debug drawing; nothing by default (h:60-62).
   *
   * @implemented
   */
  RenderDebugInfo(_renderer, _agents, _parentWorldLocation)
  {
  }

  /**
   * The neighbour search radius the group gathers for this behavior; -1 when it ignores other agents (h:64-69).
   *
   * @implemented
   * @returns {number}
   */
  GetBehaviorSearchRadius()
  {
    return -1;
  }

  /**
   * Lets another behavior switch this one on or off (h:71-74).
   *
   * @implemented
   * @param {boolean} _state
   */
  UpdateState(_state)
  {
  }
}

CjsSchema.decorateMethod(IBehavior, "CalculateBehavior", meta.abstract);

// States: the defaults are IBehavior.h:29-73 (CalculateBehavior is pure virtual and stays abstract above).
CjsSchema.decorateMethod(IBehavior, "GetScratchMemorySize", meta.implemented);
CjsSchema.decorateMethod(IBehavior, "InitializeScratch", meta.implemented);
CjsSchema.decorateMethod(IBehavior, "GetProcessPriority", meta.implemented);
CjsSchema.decorateMethod(IBehavior, "GetBehaviorName", meta.implemented);
CjsSchema.decorateMethod(IBehavior, "Reset", meta.implemented);
CjsSchema.decorateMethod(IBehavior, "GetDebugOptions", meta.implemented);
CjsSchema.decorateMethod(IBehavior, "RenderDebugInfo", meta.implemented);
CjsSchema.decorateMethod(IBehavior, "GetBehaviorSearchRadius", meta.implemented);
CjsSchema.decorateMethod(IBehavior, "UpdateState", meta.implemented);

CjsSchema.exposure.inherit(IRoot)(IBehavior);
CjsSchema.exposure.interface("IBehavior")(IBehavior);
