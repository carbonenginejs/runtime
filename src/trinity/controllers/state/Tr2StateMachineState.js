// Source: trinity/trinity/Controllers/Tr2StateMachineState.h
// Source: trinity/trinity/Controllers/Tr2StateMachineState.cpp
// Source: trinity/trinity/Controllers/Tr2StateMachineState_Blue.cpp
import { BlueList, IListNotify, INotify } from "#blue";
import { meta } from "#schema";
import { UnlinkReason } from "../enums.js";
import { BLUELISTEVENT } from "#consts/blue";
import { ContinueOnMainThread } from "../../core/continueOnMainThread.js";
import { mappedInterfaces } from "../../../global/compose/interface.js";
import { ITr2ControllerAction } from "../action/ITr2ControllerAction.js";
import { Tr2StateMachineTransition } from "./Tr2StateMachineTransition.js";


/**
 * One state of a Tr2StateMachine: starts and stops its action list on entry and
 * exit, and evaluates its outgoing transitions each update to decide the next
 * state. Its typed BlueLists report explicit list operations to this owner; raw
 * array operations bypass admission and notification.
 */
@meta.define({
  className: "Tr2StateMachineState",
  family: "controllers"
})
@meta.blue.inherit(IListNotify, INotify)
export class Tr2StateMachineState
{
  /**
   * Owned, ordered list of ITr2ControllerAction references started on entry
   * and stopped on exit. The same actions can veto an outgoing transition.
   * @type {BlueList}
   */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("ITr2ControllerAction")
  actions = new BlueList(ITr2ControllerAction, { className: null, listOps: 0 });

  /**
   * Owned, ordered list of Tr2StateMachineTransition references evaluated
   * to select the next state. This state receives the list's notifications.
   * @type {BlueList}
   */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("Tr2StateMachineTransition")
  transitions = new BlueList(Tr2StateMachineTransition, { className: "Tr2StateMachineTransition", listOps: 0 });

  /**
   * Optional finalizer that can delay leaving this state after action stops
   * have been requested; null permits completion without this check.
   * @type {ITr2StateMachineStateFinalizer|null}
   */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("ITr2StateMachineStateFinalizer")
  finalizer = null;

  /**
   * State name matched by machine lookups and transition destinations.
   * @type {string}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  _stateMachine = null;

  _isActive = false;

  _isFinalizing = false;

  _hasBeenVetoed = false;

  _transitionVariableMask = 0n;

  /**
   * Subscribes this state to its action and transition lists (cpp:13-24).
   * Adapted: explicit interface/class identities replace native list template
   * parameters and parent-lock storage; JavaScript owns references.
   */
  constructor()
  {
    this.actions.SetNotify(this);
    this.transitions.SetNotify(this);
  }

  /**
   * Relinks the finalizer after it is modified.
   *
   * Adapted: Dispatches by exposed property name instead of a native field pointer.
   * @param {string} propertyName Exposed member name.
   * @returns {boolean} True after the notification is handled.
   */
  @meta.blue.method
  @meta.adapted
  OnModified(propertyName)
  {
    if (propertyName === "finalizer" && this.finalizer && this._stateMachine)
    {
      this.finalizer.Link(this._stateMachine.GetController());
    }
    return true;
  }

  /**
   * Handles Carbon list notifications for action and transition lists.
   * Adapted: exact mapped identities represent native BlueCastPtr; helpers split
   * the two owned-list branches. Bulk, move and swap events do not change linkage.
   * @param {number} event Native list event flags.
   * @param {number} [_key=0] Unused first key.
   * @param {number} [_key2=0] Unused second key.
   * @param {object|null} [value=null] Inserted or removed object.
   * @param {IList|null} [list=null] Emitting list identity.
   * @returns {void}
   */
  @meta.blue.method
  @meta.adapted
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
   * Each action and finalizer resolves the controller through the supplied
   * machine, even when an earlier callback changes this state's linkage.
   * Adapted: JavaScript holds the state-machine reference. The existing mask
   * prepass and postpass are retained; native Link interleaves transition Link
   * and mask collection, a separate outstanding algorithm difference.
   * @param {Tr2StateMachine} stateMachine Owning state machine.
   * @returns {void}
   */
  @meta.blue.method
  @meta.adapted
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
    for (const action of this.actions)
    {
      action.Link(stateMachine.GetController());
    }
    if (this.finalizer)
    {
      this.finalizer.Link(stateMachine.GetController());
    }
  }

  /**
   * Recomputes the combined transition variable mask.
   * @returns {void}
   */
  @meta.blue.method
  @meta.implemented
  UpdateVariableMask()
  {
    this._transitionVariableMask = 0n;
    let hasMask = true;
    for (const transition of this.transitions)
    {
      const mask = Tr2StateMachineState._toBigIntMask(transition.GetVariableMask());
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
   * @param {number} [reason=UnlinkReason.UNLINKING] Native unlink reason.
   * @returns {void}
   */
  @meta.blue.method
  @meta.implemented
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
   * @returns {void}
   */
  @meta.blue.method
  @meta.implemented
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
   * @returns {void}
   */
  @meta.blue.method
  @meta.implemented
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
   * Adapted: BigInt carries the native uint64 dirty-variable mask.
   * @param {bigint|number} [dirtyVariables=0n] Variables changed by the controller.
   * @returns {Tr2StateMachineState|null} Next state, or null while remaining here.
   */
  @meta.blue.method
  @meta.adapted
  Update(dirtyVariables = 0n)
  {
    if (!this._isActive)
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
      if (!this.finalizer || this.finalizer.CanTransition(this._stateMachine.GetController()))
      {
        return next;
      }
      return null;
    }
    if (this._hasBeenVetoed)
    {
      dirtyVariables = 0xffffffffffffffffn;
    }
    if (this._transitionVariableMask !== 0n && !Tr2StateMachineState._dirtyMaskMatches(this._transitionVariableMask, dirtyVariables))
    {
      return null;
    }
    for (const transition of this.transitions)
    {
      if (transition.CanActivate(dirtyVariables) && transition.GetDestination())
      {
        for (const action of this.actions)
        {
          if (!action.CanTransition())
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
        return transition.GetDestination();
      }
    }
    return null;
  }

  /**
   * Rebases action simulation time.
   * @param {number} diff Simulation-time offset in Blue ticks.
   * @returns {void}
   */
  @meta.blue.method
  @meta.implemented
  RebaseSimTime(diff)
  {
    for (const action of this.actions)
    {
      action.RebaseSimTime(diff);
    }
  }

  /**
   * Gets the linked state machine.
   * @returns {Tr2StateMachine|null} Owning machine, or null while unlinked.
   */
  @meta.blue.method
  @meta.implemented
  GetStateMachine()
  {
    return this._stateMachine;
  }

  /**
   * Gets the authored state name.
   * @returns {string} Authored state name.
   */
  @meta.blue.method
  @meta.implemented
  GetName()
  {
    return this.name;
  }

  /**
   * Checks whether actions and the finalizer allow transition.
   * Custom: retained JavaScript convenience permits an absent controller.
   * @param {Tr2Controller|null} [controller=this._getController()] Finalizer context.
   * @returns {boolean} Whether actions and the available finalizer permit exit.
   */
  @meta.ours
  CanTransition(controller = this._getController())
  {
    for (const action of this.actions)
    {
      if (!action.CanTransition())
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
   * Adapted: native GetNextState retains its private JavaScript name and uses
   * BigInt for the native all-bits uint64 mask.
   * @returns {Tr2StateMachineState|null} First active destination, or null.
   */
  @meta.blue.method
  @meta.blue.renamed("GetNextState")
  @meta.adapted
  _getNextState()
  {
    for (const transition of this.transitions)
    {
      if (transition.CanActivate(0xffffffffffffffffn) && transition.GetDestination())
      {
        return transition.GetDestination();
      }
    }
    return null;
  }

  /**
   * Gets the controller through the linked state machine, or null when this
   * state is unlinked.
   * @returns {Tr2Controller|null} Linked controller, or null while unlinked.
   */
  @meta.ours
  _getController()
  {
    return this._stateMachine?.GetController() ?? null;
  }

  /**
   * Links and starts an inserted action when the state is already active, or
   * stops and unlinks a removed one.
   * @param {number} event Native list event flags.
   * @param {object|null} value Notification payload.
   * @returns {void}
   */
  @meta.ours
  _onActionListModified(event, value)
  {
    const action = Tr2StateMachineState._asAction(value);
    switch (event & BLUELISTEVENT.BELIST_EVENTMASK)
    {
      case BLUELISTEVENT.BELIST_INSERTED:
        if (this._stateMachine && action)
        {
          action.Link(this._stateMachine.GetController());
          if (this._isActive)
          {
            action.Start(this._stateMachine.GetController());
          }
        }
        break;
      case BLUELISTEVENT.BELIST_REMOVED:
        if (action)
        {
          if (this._stateMachine && this._isActive)
          {
            action.Stop(this._stateMachine.GetController());
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
   * @param {number} event Native list event flags.
   * @param {object|null} value Notification payload.
   * @returns {void}
   */
  @meta.ours
  _onTransitionListModified(event, value)
  {
    const transition = Tr2StateMachineState._asTransition(value);
    switch (event & BLUELISTEVENT.BELIST_EVENTMASK)
    {
      case BLUELISTEVENT.BELIST_INSERTED:
        if (this._stateMachine && transition)
        {
          transition.Link(this);
          this.UpdateVariableMask();
        }
        break;
      case BLUELISTEVENT.BELIST_REMOVED:
        if (transition)
        {
          transition.Unlink();
          this.UpdateVariableMask();
        }
        break;
    }
  }

  /**
   * Queries a list payload for the declared action interface.
   * @param {object|null} value Notification payload.
   * @returns {ITr2ControllerAction|null} Exact Blue-query match, or null.
   */
  @meta.ours
  static _asAction(value)
  {
    return value && mappedInterfaces(value.constructor).has(ITr2ControllerAction) ? value : null;
  }

  /**
   * Queries a list payload for the concrete transition interface.
   * @param {object|null} value Notification payload.
   * @returns {Tr2StateMachineTransition|null} Exact Blue-query match, or null.
   */
  @meta.ours
  static _asTransition(value)
  {
    return value && mappedInterfaces(value.constructor).has(Tr2StateMachineTransition) ? value : null;
  }

  /**
   * Coerces a variable mask to BigInt so masks from different sources can be
   * combined exactly.
   * @param {bigint|number} value JavaScript mask representation.
   * @returns {bigint} Mask with exact bitwise operations.
   */
  @meta.ours
  static _toBigIntMask(value)
  {
    return typeof value === "bigint" ? value : BigInt(value);
  }

  /**
   * Checks whether any variable this state's transitions depend on is marked
   * dirty this frame.
   * @param {bigint} mask Transition variable mask.
   * @param {bigint|number} dirtyVariables Changed controller variables.
   * @returns {boolean} Whether any relevant variable changed.
   */
  @meta.ours
  static _dirtyMaskMatches(mask, dirtyVariables)
  {
    return (mask & Tr2StateMachineState._toBigIntMask(dirtyVariables)) !== 0n;
  }
}

// Native exposure ends at this concrete table (Tr2StateMachineState_Blue.cpp).
meta.blue.interfaceTable({
  interfaces: [Tr2StateMachineState, IListNotify, INotify],
  chainTo: null
})(Tr2StateMachineState);
