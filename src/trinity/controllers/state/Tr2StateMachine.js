// Source: trinity/trinity/Controllers/Tr2StateMachine.h
// Source: trinity/trinity/Controllers/Tr2StateMachine.cpp
import * as CcpLog from "../../../global/logging/ccpLog.js";
import { CjsModel } from "#model";
import { carbon, impl, edit, type } from "#schema";
import { UnlinkReason } from "../enums.js";
import { blue, TimeAsFloat, IListNotify, ISimTimeRebaseNotify, INotify } from "#blue";
import { BLUELISTEVENT } from "#consts/blue";


/**
 * Runs one state at a time from an authored state list, entering at the
 * configured start state and following transitions as controller variables
 * change.
 */
@type.define({
  className: "Tr2StateMachine",
  family: "controllers"
})
@carbon.inherit(IListNotify, ISimTimeRebaseNotify, INotify)
export class Tr2StateMachine extends CjsModel
{
  @edit.read
  @edit.persist
  @type.list("Tr2StateMachineState")
  states = [];

  @edit.read
  @type.objectRef("Tr2StateMachineState")
  currentState = null;

  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.objectRef("Tr2StateMachineState")
  startState = null;

  @edit.readwrite
  @edit.persist
  @type.string
  name = "";

  _controller = null;

  _machineStartTime = 0;

  _stateStartTime = 0;

  /**
   * Handles Carbon list notifications for the state list.
   */
  @carbon.method
  @impl.implemented
  OnListModified(event, _key = 0, _key2 = 0, value = null, list = this.states)
  {
    if (list !== this.states)
    {
      return;
    }
    const state = Tr2StateMachine._asState(value);
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
   */
  @carbon.method
  @impl.adapted
  OnModified(propertyName)
  {
    if (propertyName === "startState" && this.startState && this._controller) this.startState.Link(this);
    return true;
  }

  /**
   * Rebases runtime timestamps and action simulation time.
   */
  @carbon.method
  @impl.adapted
  OnSimClockRebase(oldTime, newTime)
  {
    const diff = newTime - oldTime;
    this._machineStartTime += diff;
    this._stateStartTime += diff;
    for (const state of this.states)
    {
      state.RebaseSimTime?.(diff);
    }
  }

  /**
   * Links all states to a controller.
   */
  @carbon.method
  @impl.implemented
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
   */
  @carbon.method
  @impl.implemented
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
   */
  @carbon.method
  @impl.adapted
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
   */
  @carbon.method
  @impl.implemented
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
   */
  @carbon.method
  @impl.adapted
  Update(dirtyVariables = 0n)
  {
    if (this.currentState)
    {
      this._followTransitions(dirtyVariables);
    }
  }

  /**
   * Gets the linked controller.
   */
  @carbon.method
  @impl.implemented
  GetController()
  {
    return this._controller;
  }

  /**
   * Gets the active state.
   */
  GetCurrentState()
  {
    return this.currentState;
  }

  /**
   * Gets a state by index.
   */
  GetState(index)
  {
    return this.states[index] ?? null;
  }

  /**
   * Gets a state by authored name.
   */
  @carbon.method
  @impl.implemented
  GetStateByName(name)
  {
    return this.states.find(state => state.GetName?.() === name) ?? null;
  }

  /**
   * Gets seconds since this state machine started: the Blue frame-time
   * difference in ticks, converted with TimeAsFloat (`Tr2StateMachine.cpp:206-209`).
   */
  @carbon.method
  @impl.implemented
  GetMachineRunTime()
  {
    return this._machineStartTime ? TimeAsFloat(blue.os.GetCurrentFrameTime() - this._machineStartTime) : 0;
  }

  /**
   * Gets seconds since the current state started (`Tr2StateMachine.cpp:211-214`).
   */
  @carbon.method
  @impl.implemented
  GetStateRunTime()
  {
    return this._stateStartTime ? TimeAsFloat(blue.os.GetCurrentFrameTime() - this._stateStartTime) : 0;
  }

  /**
   * Gets seconds since the current state started.
   */
  GetStateTime()
  {
    return this.GetStateRunTime();
  }

  /**
   * Advances through as many immediately-satisfied transitions as the current
   * state chain produces, resetting the state start time on each hop; after 10
   * hops it counts revisits and bails out at 20 to break a transition cycle.
   */
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

  /**
   * Narrows a list payload to an object reference before it is treated as a
   * state.
   */
  static _asState(value)
  {
    return value && typeof value === "object" ? value : null;
  }
}

// Native exposure ends at this concrete table (Tr2StateMachine_Blue.cpp).
carbon.interfaceTable({
  interfaces: [Tr2StateMachine, IListNotify, INotify],
  chainTo: null
})(Tr2StateMachine);
