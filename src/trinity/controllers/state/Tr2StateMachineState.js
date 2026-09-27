// Source: trinity/trinity/Controllers/Tr2StateMachineState.h
// Source: trinity/trinity/Controllers/Tr2StateMachineState.cpp
import { CjsModel } from "#model";
import { carbon, impl, edit, type } from "#schema";
import { UnlinkReason } from "../enums.js";
import { BELIST_EVENTMASK, BELIST_INSERTED, BELIST_REMOVED, TR2_DIRTY_ALL } from "../contracts.js";
import { ContinueOnMainThread } from "../../core/continueOnMainThread.js";


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
  @edit.read
  @edit.persist
  @type.list("ITr2ControllerAction")
  actions = [];

  @edit.read
  @edit.persist
  @type.list("Tr2StateMachineTransition")
  transitions = [];

  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.objectRef("ITr2StateMachineStateFinalizer")
  finalizer = null;

  @edit.readwrite
  @edit.persist
  @type.string
  name = "";

  _stateMachine = null;

  _isActive = false;

  _isFinalizing = false;

  _hasBeenVetoed = false;

  _transitionVariableMask = 0n;

  /**
   * Relinks the finalizer after it is modified.
   *
   * Adapted: Dispatches by exposed property name instead of a native field pointer.
   */
  @carbon.method
  @impl.adapted
  OnModified(propertyName)
  {
    if (propertyName === "finalizer")
    {
      const controller = this._stateMachine?.GetController() ?? null;
      if (this.finalizer && controller) this.finalizer.Link(controller);
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
      this._onActionListModified(event, value);
    }
    else if (list === this.transitions)
    {
      this._onTransitionListModified(event, value);
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
    this._stateMachine = stateMachine;
    this.UpdateVariableMask();
    for (const transition of this.transitions)
    {
      transition.Link(this);
    }
    this.UpdateVariableMask();
    const controller = this._getController();
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
    this._transitionVariableMask = 0n;
    let hasMask = true;
    for (const transition of this.transitions)
    {
      const mask = Tr2StateMachineState._toBigIntMask(transition.GetVariableMask?.() ?? 0n);
      if (mask === 0n)
      {
        hasMask = false;
      }
      else
      {
        this._transitionVariableMask |= mask;
      }
    }
    if (!hasMask)
    {
      this._transitionVariableMask = 0n;
    }
  }

  /**
   * Unlinks transitions, actions, and the finalizer.
   */
  @carbon.method
  @impl.implemented
  Unlink(reason = UnlinkReason.UNLINKING)
  {
    if (!this._stateMachine)
    {
      return;
    }
    if (reason !== UnlinkReason.DELETING)
    {
      this.Stop();
    }
    this._stateMachine = null;
    for (const transition of this.transitions)
    {
      transition.Unlink();
    }
    for (const action of this.actions)
    {
      action.Unlink();
    }
    this.finalizer?.Unlink();
    this._transitionVariableMask = 0n;
  }

  /**
   * Marks the state active and queues each action's Start on the main-thread
   * queue (`Tr2StateMachineState.cpp:268-291`). The actions start when
   * ExecuteMainThreadActions drains, so a transition chain followed in the
   * same update sees the new state before its actions have started. Each
   * queued call re-reads the state machine and skips the action if the state
   * was unlinked before the drain, as the donor's lambda does.
   */
  @carbon.method
  @impl.implemented
  Start()
  {
    if (this._isActive)
    {
      return;
    }
    if (this._stateMachine)
    {
      for (const action of this.actions)
      {
        ContinueOnMainThread(() =>
        {
          if (this._stateMachine && action)
          {
            action.Start(this._stateMachine.GetController());
          }
        });
      }
      this._isActive = true;
      this._isFinalizing = false;
      this._hasBeenVetoed = false;
    }
  }

  /**
   * Queues each action's Stop on the main-thread queue, then asks the
   * finalizer whether the state may leave (`Tr2StateMachineState.cpp:293-321`).
   * The finalizer is consulted before the queued Stops run, as in the donor.
   */
  @carbon.method
  @impl.implemented
  Stop()
  {
    if (!this._isActive || this._isFinalizing)
    {
      return;
    }
    if (this._stateMachine)
    {
      for (const action of this.actions)
      {
        ContinueOnMainThread(() =>
        {
          if (this._stateMachine && action)
          {
            action.Stop(this._stateMachine.GetController());
          }
        });
      }
      if (this.finalizer)
      {
        if (!this.finalizer.CanTransition(this._stateMachine.GetController()))
        {
          this._isFinalizing = true;
          return;
        }
      }
    }
    this._isActive = false;
  }

  /**
   * Updates transitions and returns the next state when one activates.
   */
  @carbon.method
  @impl.adapted
  Update(dirtyVariables = 0n)
  {
    if (!this._isActive)
    {
      return null;
    }
    const controller = this._getController();
    if (!controller)
    {
      return null;
    }
    if (this._isFinalizing)
    {
      const next = this._getNextState();
      if (!next)
      {
        this._isActive = false;
        this.Start();
      }
      if (!this.finalizer || this.finalizer.CanTransition(controller))
      {
        return next;
      }
      return null;
    }
    if (this._hasBeenVetoed)
    {
      dirtyVariables = TR2_DIRTY_ALL;
    }
    if (this._transitionVariableMask !== 0n && !Tr2StateMachineState._dirtyMaskMatches(this._transitionVariableMask, dirtyVariables))
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
            this._hasBeenVetoed = true;
            return null;
          }
        }
        this.Stop();
        if (this._isFinalizing)
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
    return this._stateMachine;
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
  CanTransition(controller = this._getController())
  {
    for (const action of this.actions)
    {
      if (action.CanTransition && !action.CanTransition())
      {
        this._hasBeenVetoed = true;
        return false;
      }
    }
    return !this.finalizer || !controller || this.finalizer.CanTransition(controller);
  }

  /**
   * Finds the destination of the first transition that activates against a fully
   * dirty variable mask, used to resolve where to go once finalizing completes.
   */
  _getNextState()
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
  _getController()
  {
    return this._stateMachine?.GetController() ?? null;
  }

  /**
   * Links and starts an inserted action when the state is already active, or
   * stops and unlinks a removed one.
   */
  _onActionListModified(event, value)
  {
    const action = Tr2StateMachineState._asAction(value);
    const controller = this._getController();
    switch (event & BELIST_EVENTMASK)
    {
      case BELIST_INSERTED:
        if (controller && action)
        {
          action.Link(controller);
          if (this._isActive)
          {
            action.Start(controller);
          }
        }
        break;
      case BELIST_REMOVED:
        if (action)
        {
          if (controller && this._isActive)
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
  _onTransitionListModified(event, value)
  {
    const transition = Tr2StateMachineState._asTransition(value);
    switch (event & BELIST_EVENTMASK)
    {
      case BELIST_INSERTED:
        if (this._stateMachine && transition)
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
  static _asAction(value)
  {
    return value && typeof value === "object" ? value : null;
  }

  /**
   * Narrows a list payload to an object reference before it is treated as a
   * transition.
   */
  static _asTransition(value)
  {
    return value && typeof value === "object" ? value : null;
  }

  /**
   * Coerces a variable mask to BigInt so masks from different sources can be
   * combined exactly.
   */
  static _toBigIntMask(value)
  {
    return typeof value === "bigint" ? value : BigInt(value);
  }

  /**
   * Checks whether any variable this state's transitions depend on is marked
   * dirty this frame.
   */
  static _dirtyMaskMatches(mask, dirtyVariables)
  {
    return (mask & Tr2StateMachineState._toBigIntMask(dirtyVariables)) !== 0n;
  }
}
