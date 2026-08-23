// Source: trinity/trinity/Controllers/Tr2StateMachine.h
// Source: trinity/trinity/Controllers/Tr2StateMachine.cpp
import { CjsModel } from "#model";
import { carbon, impl, io, type } from "#schema";
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
  @io.persist
  @type.list("Tr2StateMachineState")
  states = [];

  @io.read
  @type.objectRef("Tr2StateMachineState")
  currentState = null;

  @io.notify
  @io.persist
  @type.objectRef("Tr2StateMachineState")
  startState = null;

  @io.persist
  @type.string
  name = "";

  #controller = null;

  #machineStartTime = 0;

  #stateStartTime = 0;

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
    const state = Tr2StateMachine.#asState(value);
    switch (event & BELIST_EVENTMASK)
    {
      case BELIST_INSERTED:
        if (this.#controller && state)
        {
          state.Link?.(this);
        }
        break;
      case BELIST_REMOVED:
        if (state)
        {
          if (state === this.currentState)
          {
            state.Stop?.();
          }
          this.currentState = this.startState;
          this.#stateStartTime = GetControllerTimeSeconds();
          this.currentState?.Start?.(this.#controller);
          state.Unlink?.();
        }
        break;
    }
  }

  /**
   * Relinks the start state after it is modified.
   */
  @carbon.method
  @impl.implemented
  OnModified(_options = {})
  {
    if (this.startState && this.#controller)
    {
      this.startState.Link?.(this);
    }
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
    this.#machineStartTime += diff;
    this.#stateStartTime += diff;
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
    this.#controller = controller;
    for (const state of this.states)
    {
      state.Link?.(this);
    }
  }

  /**
   * Unlinks all states from the current controller.
   */
  @carbon.method
  @impl.implemented
  Unlink(reason = UnlinkReason.UNLINKING)
  {
    if (!this.#controller)
    {
      return;
    }
    if (reason !== UnlinkReason.DELETING)
    {
      this.Stop();
    }
    for (const state of this.states)
    {
      state.Unlink?.(reason);
    }
    this.#controller = null;
  }

  /**
   * Starts at the configured start state and follows immediate transitions.
   */
  @carbon.method
  @impl.adapted
  Start()
  {
    if (this.currentState || !this.#controller)
    {
      return;
    }
    this.currentState = this.startState;
    const now = GetControllerTimeSeconds();
    this.#machineStartTime = now;
    this.#stateStartTime = now;
    if (!this.currentState)
    {
      return;
    }
    this.currentState.Start?.(this.#controller);
    this.#followTransitions(TR2_DIRTY_ALL);
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
      this.currentState.Stop?.(this.#controller);
      this.currentState = null;
    }
    this.#machineStartTime = 0;
    this.#stateStartTime = 0;
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
      this.#followTransitions(dirtyVariables);
    }
  }

  /**
   * Gets the linked controller.
   */
  @carbon.method
  @impl.implemented
  GetController()
  {
    return this.#controller;
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
    return this.#machineStartTime ? GetControllerTimeSeconds() - this.#machineStartTime : 0;
  }

  /**
   * Gets seconds since the current state started.
   */
  @carbon.method
  @impl.adapted
  GetStateRunTime()
  {
    return this.#stateStartTime ? GetControllerTimeSeconds() - this.#stateStartTime : 0;
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
  #followTransitions(dirtyVariables)
  {
    let next = this.currentState?.Update?.(dirtyVariables) ?? null;
    if (!next)
    {
      return;
    }
    const seen = new Map();
    for (let iteration = 0; next; iteration++)
    {
      if (iteration > 10)
      {
        const count = (seen.get(next) ?? 0) + 1;
        if (count > 20)
        {
          return;
        }
        seen.set(next, count);
      }
      this.currentState = next;
      this.currentState.Start?.(this.#controller);
      this.#stateStartTime = GetControllerTimeSeconds();
      next = this.currentState.Update?.(TR2_DIRTY_ALL) ?? null;
    }
  }

  /**
   * Narrows a list payload to an object reference before it is treated as a
   * state.
   */
  static #asState(value)
  {
    return value && typeof value === "object" ? value : null;
  }
}
