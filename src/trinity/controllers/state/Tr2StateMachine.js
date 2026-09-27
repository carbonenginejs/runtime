// Source: trinity/trinity/Controllers/Tr2StateMachine.h
// Source: trinity/trinity/Controllers/Tr2StateMachine.cpp
import { CjsModel } from "#model";
import { carbon, impl, edit, type } from "#schema";
import { UnlinkReason } from "../enums.js";
import { BELIST_EVENTMASK, BELIST_INSERTED, BELIST_REMOVED, GetControllerTimeSeconds, TR2_DIRTY_ALL } from "../contracts.js";


/**
 * Runs one state at a time from an authored state list, entering at the
 * configured start state and following transitions as controller variables
 * change.
 */
@type.define({
  className: "Tr2StateMachine",
  family: "controllers"
})
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
    switch (event & BELIST_EVENTMASK)
    {
      case BELIST_INSERTED:
        if (this._controller && state)
        {
          state.Link(this);
        }
        break;
      case BELIST_REMOVED:
        if (state)
        {
          if (state === this.currentState)
          {
            state.Stop();
          }
          this.currentState = this.startState;
          this._stateStartTime = GetControllerTimeSeconds();
          this.currentState?.Start(this._controller);
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
    const now = GetControllerTimeSeconds();
    this._machineStartTime = now;
    this._stateStartTime = now;
    if (!this.currentState)
    {
      return;
    }
    this.currentState.Start(this._controller);
    this._followTransitions(TR2_DIRTY_ALL);
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
      this.currentState.Stop(this._controller);
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
   * Gets seconds since this state machine started.
   */
  @carbon.method
  @impl.adapted
  GetMachineRunTime()
  {
    return this._machineStartTime ? GetControllerTimeSeconds() - this._machineStartTime : 0;
  }

  /**
   * Gets seconds since the current state started.
   */
  @carbon.method
  @impl.adapted
  GetStateRunTime()
  {
    return this._stateStartTime ? GetControllerTimeSeconds() - this._stateStartTime : 0;
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
            return;
          }
        }
        else
        {
          seen.push({ state: next, count: 1 });
        }
      }
      this.currentState = next;
      this.currentState.Start(this._controller);
      this._stateStartTime = GetControllerTimeSeconds();
      next = this.currentState.Update(TR2_DIRTY_ALL) ?? null;
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
