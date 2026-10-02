// Source: trinity/trinity/Controllers/Tr2StateMachine.h
// Source: trinity/trinity/Controllers/Tr2StateMachine.cpp
import * as CcpLog from "../../../global/logging/ccpLog.js";
import { meta } from "#schema";
import { UnlinkReason } from "../enums.js";
import { IsMatch, blue, BlueList, TimeAsFloat, IListNotify, ISimTimeRebaseNotify, INotify } from "#blue";
import { BLUELISTEVENT } from "#consts/blue";
import { mappedInterfaces } from "../../../global/compose/interface.js";
import { Tr2StateMachineState } from "./Tr2StateMachineState.js";


/**
 * Runs one state at a time from an authored state list, entering at the
 * configured start state and following transitions as controller variables
 * change. Its typed BlueList reports explicit list operations to this owner;
 * raw array operations bypass admission and notification.
 */
@meta.define({
  className: "Tr2StateMachine",
  family: "controllers"
})
@meta.blue.inherit(IListNotify, ISimTimeRebaseNotify, INotify)
export class Tr2StateMachine
{
  /**
   * Owned, ordered list of Tr2StateMachineState references. List operations
   * notify this machine so it can maintain state linkage.
   * @type {BlueList}
   */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("Tr2StateMachineState")
  states = new BlueList(Tr2StateMachineState, { className: "Tr2StateMachineState", listOps: 0 });

  /**
   * Runtime reference to the selected state, or null when none is running.
   * This reference is not persisted with the authored machine.
   * @type {Tr2StateMachineState|null}
   */
  @meta.blue.read
  @meta.type.objectRef("Tr2StateMachineState")
  currentState = null;

  /**
   * Authored entry-state reference used by Start and when removing a state
   * restarts the machine; it refers to the state itself rather than a copy.
   * @type {Tr2StateMachineState|null}
   */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("Tr2StateMachineState")
  startState = null;

  /**
   * Authored identifier for this state machine within a controller.
   * @type {string}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  _controller = null;

  _machineStartTime = 0;

  _stateStartTime = 0;

  /**
   * Subscribes this state machine to its owned state list (cpp:13-23).
   * Adapted: explicit constructor identity and class name replace native list
   * template parameters and parent-lock storage; JavaScript owns references.
   */
  constructor()
  {
    this.states.SetNotify(this);
  }

  /**
   * Links inserted states and restarts the configured start state on removal.
   * Removal restarts even when the removed state was not current or the machine
   * is unlinked; removing the start state retains that current-state reference.
   * Unload, load, move and swap events do not change linkage (cpp:35-69).
   * Adapted: exact mapped constructor identity represents native BlueCastPtr.
   * @param {number} event List event flags.
   * @param {number} [_key=0] Unused first key.
   * @param {number} [_key2=0] Unused second key.
   * @param {object|null} [value=null] Inserted or removed object.
   * @param {IList|null} [list=this.states] Emitting list identity.
   * @returns {void}
   */
  @meta.blue.method
  @meta.adapted
  OnListModified(event, _key = 0, _key2 = 0, value = null, list = this.states)
  {
    if (list !== this.states)
    {
      return;
    }
    const state = value && mappedInterfaces(value.constructor).has(Tr2StateMachineState) ? value : null;
    switch (event & BLUELISTEVENT.BELIST_EVENTMASK)
    {
      case BLUELISTEVENT.BELIST_INSERTED:
        if (this._controller && state)
        {
          state.Link(this);
        }
        break;
      case BLUELISTEVENT.BELIST_REMOVED:
        if (state)
        {
          if (state === this.currentState)
          {
            state.Stop();
          }
          this.currentState = this.startState;
          this._stateStartTime = blue.os.GetCurrentFrameTime();
          this.currentState?.Start();
          state.Unlink();
        }
        break;
    }
  }

  /**
   * Relinks the start state after it is modified.
   *
   * Adapted: Dispatches by exposed property name instead of a native field pointer.
   * @param {string} propertyName Exposed member name.
   * @returns {boolean} True after the notification is handled.
   */
  @meta.blue.method
  @meta.adapted
  OnModified(propertyName)
  {
    if (IsMatch(propertyName, "startState") && this.startState && this._controller) this.startState.Link(this);
    return true;
  }

  /**
   * Rebases runtime timestamps and action simulation time.
   * @param {number} oldTime Previous simulation time in Blue ticks.
   * @param {number} newTime Replacement simulation time in Blue ticks.
   * @returns {void}
   */
  @meta.blue.method
  @meta.adapted
  OnSimClockRebase(oldTime, newTime)
  {
    const diff = newTime - oldTime;
    this._machineStartTime += diff;
    this._stateStartTime += diff;
    for (const state of this.states)
    {
      state.RebaseSimTime(diff);
    }
  }

  /**
   * Links all states to a controller.
   * @param {Tr2Controller} controller Controller owning this machine.
   * @returns {void}
   */
  @meta.blue.method
  @meta.implemented
  Link(controller)
  {
    this.Unlink();
    this._controller = controller;
    for (const state of this.states)
    {
      state.Link(this);
    }
  }

  /**
   * Unlinks all states from the current controller.
   * @param {number} [reason=UnlinkReason.UNLINKING] Native unlink reason.
   * @returns {void}
   */
  @meta.blue.method
  @meta.implemented
  Unlink(reason = UnlinkReason.UNLINKING)
  {
    if (!this._controller)
    {
      return;
    }
    if (reason !== UnlinkReason.DELETING)
    {
      this.Stop();
    }
    for (const state of this.states)
    {
      state.Unlink(reason);
    }
    this._controller = null;
  }

  /**
   * Starts at the configured start state and follows immediate transitions.
   * Adapted: BigInt preserves the native all-bits uint64 dirty mask.
   * @returns {void}
   */
  @meta.blue.method
  @meta.adapted
  Start()
  {
    if (this.currentState || !this._controller)
    {
      return;
    }
    this.currentState = this.startState;
    const now = blue.os.GetCurrentFrameTime();
    this._machineStartTime = now;
    this._stateStartTime = now;
    if (!this.currentState)
    {
      return;
    }
    this.currentState.Start();
    this._followTransitions(0xffffffffffffffffn);
  }

  /**
   * Stops the current state.
   * @returns {void}
   */
  @meta.blue.method
  @meta.implemented
  Stop()
  {
    if (this.currentState)
    {
      this.currentState.Stop();
      this.currentState = null;
    }
    this._machineStartTime = 0;
    this._stateStartTime = 0;
  }

  /**
   * Updates the current state.
   * Adapted: BigInt carries the native uint64 dirty-variable mask.
   * @param {bigint} [dirtyVariables=0n] Variables changed by the controller.
   * @returns {void}
   */
  @meta.blue.method
  @meta.adapted
  Update(dirtyVariables = 0n)
  {
    if (this.currentState)
    {
      this._followTransitions(dirtyVariables);
    }
  }

  /**
   * Gets the linked controller.
   * @returns {Tr2Controller|null} Linked controller, or null while unlinked.
   */
  @meta.blue.method
  @meta.implemented
  GetController()
  {
    return this._controller;
  }

  /**
   * Gets the active state for JavaScript consumers.
   * @returns {Tr2StateMachineState|null} Current state, or null while stopped.
   */
  @meta.ours
  GetCurrentState()
  {
    return this.currentState;
  }

  /**
   * Gets a state by index for JavaScript consumers.
   * @param {number} index State list index.
   * @returns {Tr2StateMachineState|null} State, or null outside the list.
   */
  @meta.ours
  GetState(index)
  {
    return this.states[index] ?? null;
  }

  /**
   * Gets a state by authored name.
   * @param {string} name Authored state name.
   * @returns {Tr2StateMachineState|null} Matching state, or null when absent.
   */
  @meta.blue.method
  @meta.implemented
  GetStateByName(name)
  {
    return this.states.find(state => state.GetName() === name) ?? null;
  }

  /**
   * Gets seconds since this state machine started: the Blue frame-time
   * difference in ticks, converted with TimeAsFloat (`Tr2StateMachine.cpp:206-209`).
   * @returns {number} Elapsed seconds, or zero when the timestamp is zero.
   */
  @meta.blue.method
  @meta.implemented
  GetMachineRunTime()
  {
    return this._machineStartTime ? TimeAsFloat(blue.os.GetCurrentFrameTime() - this._machineStartTime) : 0;
  }

  /**
   * Gets seconds since the current state started (`Tr2StateMachine.cpp:211-214`).
   * @returns {number} Elapsed seconds, or zero when the timestamp is zero.
   */
  @meta.blue.method
  @meta.implemented
  GetStateRunTime()
  {
    return this._stateStartTime ? TimeAsFloat(blue.os.GetCurrentFrameTime() - this._stateStartTime) : 0;
  }

  /**
   * Gets state runtime through the retained JavaScript convenience name.
   * @returns {number} Elapsed seconds from GetStateRunTime.
   */
  @meta.ours
  GetStateTime()
  {
    return this.GetStateRunTime();
  }

  /**
   * Advances through as many immediately-satisfied transitions as the current
   * state chain produces, resetting the state start time on each hop; after 10
   * hops it counts revisits and bails out after 20 to break a transition cycle.
   * Adapted: native FollowTransitions retains its private JavaScript name;
   * BigInt carries the all-bits mask and JavaScript references hold seen states.
   * @param {bigint} dirtyVariables Variables changed for the first transition.
   * @returns {void}
   */
  @meta.blue.method
  @meta.blue.renamed("FollowTransitions")
  @meta.adapted
  _followTransitions(dirtyVariables)
  {
    let next = this.currentState?.Update(dirtyVariables) ?? null;
    if (!next)
    {
      return;
    }
    const seen = [];
    for (let iteration = 0; next; iteration++)
    {
      if (iteration > 10)
      {
        // Native quirk: append current before incrementing the first next-state
        // record (Tr2StateMachine.cpp:128-145); duplicates remain in the list.
        seen.push({ state: this.currentState, count: 1 });
        const found = seen.find(entry => entry.state === next);
        if (found)
        {
          found.count++;
          if (found.count > 20)
          {
            CcpLog.CCP_LOGERR_CH(CcpLog.GetModuleChannel("trinity"), "%s", `Tr2StateMachine: infinite loop in state machine ${this.name} detected`);
            return;
          }
        }
        else
        {
          seen.push({ state: next, count: 1 });
        }
      }
      this.currentState = next;
      this.currentState.Start();
      this._stateStartTime = blue.os.GetCurrentFrameTime();
      next = this.currentState.Update(0xffffffffffffffffn) ?? null;
    }
  }
}

// Native exposure ends at this concrete table (Tr2StateMachine_Blue.cpp).
meta.blue.interfaceTable({
  interfaces: [Tr2StateMachine, IListNotify, INotify],
  chainTo: null
})(Tr2StateMachine);
