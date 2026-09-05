// Source: trinity/trinity/Controllers/Tr2StateMachineState.h
// Source: trinity/trinity/Controllers/Tr2StateMachineState.cpp
import { CjsModel } from "#model";
import { carbon, impl, io, type } from "#schema";
import { UnlinkReason } from "../enums.js";
import { BELIST_EVENTMASK, BELIST_INSERTED, BELIST_REMOVED, TR2_DIRTY_ALL } from "../contracts.js";


/**
 * One state of a Tr2StateMachine: starts and stops its action list on entry and
 * exit, and evaluates its outgoing transitions each update to decide the next
 * state.
 */
@type.define({
  className: "Tr2StateMachineState",
  family: "controllers"
})
export class Tr2StateMachineState extends CjsModel
{
  @io.persist
  @type.list("ITr2ControllerAction")
  actions = [];

  @io.persist
  @type.list("Tr2StateMachineTransition")
  transitions = [];

  @io.notify
  @io.persist
  @type.objectRef("ITr2StateMachineStateFinalizer")
  finalizer = null;

  @io.persist
  @type.string
  name = "";

  #stateMachine = null;

  #isActive = false;

  #isFinalizing = false;

  #hasBeenVetoed = false;

  #transitionVariableMask = 0n;

  /**
   * Relinks the finalizer after it is modified.
   */
  @carbon.method
  @impl.implemented
  OnModified(_options = {})
  {
    const controller = this.#stateMachine?.GetController?.() ?? null;
    if (this.finalizer && controller)
    {
      this.finalizer.Link(controller);
    }
    return true;
  }

  /**
   * Handles Carbon list notifications for action and transition lists.
   */
  @carbon.method
  @impl.implemented
  OnListModified(event, _key = 0, _key2 = 0, value = null, list = null)
  {
    if (list === this.actions)
    {
      this.#onActionListModified(event, value);
    }
    else if (list === this.transitions)
    {
      this.#onTransitionListModified(event, value);
    }
  }

  /**
   * Links transitions, actions, and the finalizer to a state machine.
   */
  @carbon.method
  @impl.adapted
  Link(stateMachine)
  {
    this.Unlink();
    this.#stateMachine = stateMachine;
    this.UpdateVariableMask();
    for (const transition of this.transitions)
    {
      transition.Link(this);
    }
    this.UpdateVariableMask();
    const controller = this.#getController();
    if (controller)
    {
      for (const action of this.actions)
      {
        action.Link(controller);
      }
      this.finalizer?.Link(controller);
    }
  }

  /**
   * Recomputes the combined transition variable mask.
   */
  @carbon.method
  @impl.implemented
  UpdateVariableMask()
  {
    this.#transitionVariableMask = 0n;
    let hasMask = true;
    for (const transition of this.transitions)
    {
      const mask = Tr2StateMachineState.#toBigIntMask(transition.GetVariableMask?.() ?? 0n);
      if (mask === 0n)
      {
        hasMask = false;
      }
      else
      {
        this.#transitionVariableMask |= mask;
      }
    }
    if (!hasMask)
    {
      this.#transitionVariableMask = 0n;
    }
  }

  /**
   * Unlinks transitions, actions, and the finalizer.
   */
  @carbon.method
  @impl.implemented
  Unlink(reason = UnlinkReason.UNLINKING)
  {
    if (!this.#stateMachine)
    {
      return;
    }
    if (reason !== UnlinkReason.DELETING)
    {
      this.Stop();
    }
    this.#stateMachine = null;
    for (const transition of this.transitions)
    {
      transition.Unlink();
    }
    for (const action of this.actions)
    {
      action.Unlink();
    }
    this.finalizer?.Unlink();
  }

  /**
   * Starts all actions.
   */
  @carbon.method
  @impl.adapted
  Start(controller = this.#getController())
  {
    if (this.#isActive)
    {
      return;
    }
    if (!controller)
    {
      return;
    }
    for (const action of this.actions)
    {
      action.Start(controller);
    }
    this.#isActive = true;
    this.#isFinalizing = false;
    this.#hasBeenVetoed = false;
  }

  /**
   * Stops all actions.
   */
  @carbon.method
  @impl.adapted
  Stop(controller = this.#getController())
  {
    if (!this.#isActive || this.#isFinalizing)
    {
      return;
    }
    if (controller)
    {
      for (const action of this.actions)
      {
        action.Stop(controller);
      }
    }
    if (this.finalizer && controller && !this.finalizer.CanTransition(controller))
    {
      this.#isFinalizing = true;
      return;
    }
    this.#isActive = false;
  }

  /**
   * Updates transitions and returns the next state when one activates.
   */
  @carbon.method
  @impl.adapted
  Update(dirtyVariables = 0n)
  {
    if (!this.#isActive)
    {
      return null;
    }
    const controller = this.#getController();
    if (!controller)
    {
      return null;
    }
    if (this.#isFinalizing)
    {
      const next = this.#getNextState();
      if (!next)
      {
        this.#isActive = false;
        this.Start(controller);
      }
      if (!this.finalizer || this.finalizer.CanTransition(controller))
      {
        return next;
      }
      return null;
    }
    if (this.#hasBeenVetoed)
    {
      dirtyVariables = TR2_DIRTY_ALL;
    }
    if (this.#transitionVariableMask !== 0n && !Tr2StateMachineState.#dirtyMaskMatches(this.#transitionVariableMask, dirtyVariables))
    {
      return null;
    }
    for (const transition of this.transitions)
    {
      const destination = transition.GetDestination?.() ?? null;
      const canTransition = transition.CanActivate?.(dirtyVariables) ?? false;
      if (canTransition && destination)
      {
        for (const action of this.actions)
        {
          if (action.CanTransition && !action.CanTransition())
          {
            this.#hasBeenVetoed = true;
            return null;
          }
        }
        this.Stop(controller);
        if (this.#isFinalizing)
        {
          return null;
        }
        return destination;
      }
    }
    return null;
  }

  /**
   * Rebases action simulation time.
   */
  @carbon.method
  @impl.implemented
  RebaseSimTime(diff)
  {
    for (const action of this.actions)
    {
      action.RebaseSimTime?.(diff);
    }
  }

  /**
   * Gets the linked state machine.
   */
  @carbon.method
  @impl.implemented
  GetStateMachine()
  {
    return this.#stateMachine;
  }

  /**
   * Gets the authored state name.
   */
  @carbon.method
  @impl.implemented
  GetName()
  {
    return this.name;
  }

  /**
   * Checks whether actions and the finalizer allow transition.
   */
  CanTransition(controller = this.#getController())
  {
    for (const action of this.actions)
    {
      if (action.CanTransition && !action.CanTransition())
      {
        this.#hasBeenVetoed = true;
        return false;
      }
    }
    return !this.finalizer || !controller || this.finalizer.CanTransition(controller);
  }

  /**
   * Finds the destination of the first transition that activates against a fully
   * dirty variable mask, used to resolve where to go once finalizing completes.
   */
  #getNextState()
  {
    for (const transition of this.transitions)
    {
      const destination = transition.GetDestination?.() ?? null;
      if (transition.CanActivate?.(TR2_DIRTY_ALL) && destination)
      {
        return destination;
      }
    }
    return null;
  }

  /**
   * Gets the controller through the linked state machine, or null when this
   * state is unlinked.
   */
  #getController()
  {
    return this.#stateMachine?.GetController?.() ?? null;
  }

  /**
   * Links and starts an inserted action when the state is already active, or
   * stops and unlinks a removed one.
   */
  #onActionListModified(event, value)
  {
    const action = Tr2StateMachineState.#asAction(value);
    const controller = this.#getController();
    switch (event & BELIST_EVENTMASK)
    {
      case BELIST_INSERTED:
        if (controller && action)
        {
          action.Link(controller);
          if (this.#isActive)
          {
            action.Start(controller);
          }
        }
        break;
      case BELIST_REMOVED:
        if (action)
        {
          if (controller && this.#isActive)
          {
            action.Stop(controller);
          }
          action.Unlink();
        }
        break;
    }
  }

  /**
   * Links or unlinks a transition as the list changes and recomputes the
   * combined variable mask, which gates whether Update evaluates transitions at
   * all.
   */
  #onTransitionListModified(event, value)
  {
    const transition = Tr2StateMachineState.#asTransition(value);
    switch (event & BELIST_EVENTMASK)
    {
      case BELIST_INSERTED:
        if (this.#stateMachine && transition)
        {
          transition.Link(this);
          this.UpdateVariableMask();
        }
        break;
      case BELIST_REMOVED:
        if (transition)
        {
          transition.Unlink();
          this.UpdateVariableMask();
        }
        break;
    }
  }

  /**
   * Narrows a list payload to an object reference before it is treated as an
   * action.
   */
  static #asAction(value)
  {
    return value && typeof value === "object" ? value : null;
  }

  /**
   * Narrows a list payload to an object reference before it is treated as a
   * transition.
   */
  static #asTransition(value)
  {
    return value && typeof value === "object" ? value : null;
  }

  /**
   * Coerces a variable mask to BigInt so masks from different sources can be
   * combined exactly.
   */
  static #toBigIntMask(value)
  {
    return typeof value === "bigint" ? value : BigInt(value);
  }

  /**
   * Checks whether any variable this state's transitions depend on is marked
   * dirty this frame.
   */
  static #dirtyMaskMatches(mask, dirtyVariables)
  {
    return (mask & Tr2StateMachineState.#toBigIntMask(dirtyVariables)) !== 0n;
  }
}
