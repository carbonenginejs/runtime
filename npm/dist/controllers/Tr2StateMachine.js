import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { UnlinkReason } from './enums.js';
import { BELIST_EVENTMASK, BELIST_REMOVED, GetControllerTimeSeconds, BELIST_INSERTED, TR2_DIRTY_ALL } from './contracts.js';

let _initProto, _initClass, _init_states, _init_extra_states, _init_currentState, _init_extra_currentState, _init_startState, _init_extra_startState, _init_name, _init_extra_name;

/**
 * Runs one state at a time from an authored state list, entering at the
 * configured start state and following transitions as controller variables
 * change.
 */
let _Tr2StateMachine;
new class extends _identity {
  static [class Tr2StateMachine extends CjsModel {
    static {
      ({
        e: [_init_states, _init_extra_states, _init_currentState, _init_extra_currentState, _init_startState, _init_extra_startState, _init_name, _init_extra_name, _initProto],
        c: [_Tr2StateMachine, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2StateMachine",
        family: "controllers"
      })], [[[io, io.persist, void 0, type.list("Tr2StateMachineState")], 16, "states"], [[io, io.read, void 0, type.objectRef("Tr2StateMachineState")], 16, "currentState"], [[io, io.notify, io, io.persist, void 0, type.objectRef("Tr2StateMachineState")], 16, "startState"], [[io, io.persist, type, type.string], 16, "name"], [[carbon, carbon.method, impl, impl.implemented], 18, "OnListModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "OnModified"], [[carbon, carbon.method, impl, impl.adapted], 18, "OnSimClockRebase"], [[carbon, carbon.method, impl, impl.implemented], 18, "Link"], [[carbon, carbon.method, impl, impl.implemented], 18, "Unlink"], [[carbon, carbon.method, impl, impl.adapted], 18, "Start"], [[carbon, carbon.method, impl, impl.implemented], 18, "Stop"], [[carbon, carbon.method, impl, impl.adapted], 18, "Update"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetController"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetStateByName"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetMachineRunTime"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetStateRunTime"]], 0, void 0, CjsModel));
    }
    states = (_initProto(this), _init_states(this, []));
    currentState = (_init_extra_states(this), _init_currentState(this, null));
    startState = (_init_extra_currentState(this), _init_startState(this, null));
    name = (_init_extra_startState(this), _init_name(this, ""));
    #controller = (_init_extra_name(this), null);
    #machineStartTime = 0;
    #stateStartTime = 0;

    /**
     * Handles Carbon list notifications for the state list.
     */
    OnListModified(event, _key = 0, _key2 = 0, value = null, list = this.states) {
      if (list !== this.states) {
        return;
      }
      const state = _Tr2StateMachine.#asState(value);
      switch (event & BELIST_EVENTMASK) {
        case BELIST_INSERTED:
          if (this.#controller && state) {
            state.Link?.(this);
          }
          break;
        case BELIST_REMOVED:
          if (state) {
            if (state === this.currentState) {
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
    OnModified(_options = {}) {
      if (this.startState && this.#controller) {
        this.startState.Link?.(this);
      }
      return true;
    }

    /**
     * Rebases runtime timestamps and action simulation time.
     */
    OnSimClockRebase(oldTime, newTime) {
      const diff = newTime - oldTime;
      this.#machineStartTime += diff;
      this.#stateStartTime += diff;
      for (const state of this.states) {
        state.RebaseSimTime?.(diff);
      }
    }

    /**
     * Links all states to a controller.
     */
    Link(controller) {
      this.Unlink();
      this.#controller = controller;
      for (const state of this.states) {
        state.Link?.(this);
      }
    }

    /**
     * Unlinks all states from the current controller.
     */
    Unlink(reason = UnlinkReason.UNLINKING) {
      if (!this.#controller) {
        return;
      }
      if (reason !== UnlinkReason.DELETING) {
        this.Stop();
      }
      for (const state of this.states) {
        state.Unlink?.(reason);
      }
      this.#controller = null;
    }

    /**
     * Starts at the configured start state and follows immediate transitions.
     */
    Start() {
      if (this.currentState || !this.#controller) {
        return;
      }
      this.currentState = this.startState;
      const now = GetControllerTimeSeconds();
      this.#machineStartTime = now;
      this.#stateStartTime = now;
      if (!this.currentState) {
        return;
      }
      this.currentState.Start?.(this.#controller);
      this.#followTransitions(TR2_DIRTY_ALL);
    }

    /**
     * Stops the current state.
     */
    Stop() {
      if (this.currentState) {
        this.currentState.Stop?.(this.#controller);
        this.currentState = null;
      }
      this.#machineStartTime = 0;
      this.#stateStartTime = 0;
    }

    /**
     * Updates the current state.
     */
    Update(dirtyVariables = 0n) {
      if (this.currentState) {
        this.#followTransitions(dirtyVariables);
      }
    }

    /**
     * Gets the linked controller.
     */
    GetController() {
      return this.#controller;
    }

    /**
     * Gets the active state.
     */
    GetCurrentState() {
      return this.currentState;
    }

    /**
     * Gets a state by index.
     */
    GetState(index) {
      return this.states[index] ?? null;
    }

    /**
     * Gets a state by authored name.
     */
    GetStateByName(name) {
      return this.states.find(state => state.GetName?.() === name) ?? null;
    }

    /**
     * Gets seconds since this state machine started.
     */
    GetMachineRunTime() {
      return this.#machineStartTime ? GetControllerTimeSeconds() - this.#machineStartTime : 0;
    }

    /**
     * Gets seconds since the current state started.
     */
    GetStateRunTime() {
      return this.#stateStartTime ? GetControllerTimeSeconds() - this.#stateStartTime : 0;
    }

    /**
     * Gets seconds since the current state started.
     */
    GetStateTime() {
      return this.GetStateRunTime();
    }

    /**
     * Advances through as many immediately-satisfied transitions as the current
     * state chain produces, resetting the state start time on each hop; after 10
     * hops it counts revisits and bails out at 20 to break a transition cycle.
     */
    #followTransitions(dirtyVariables) {
      let next = this.currentState?.Update?.(dirtyVariables) ?? null;
      if (!next) {
        return;
      }
      const seen = new Map();
      for (let iteration = 0; next; iteration++) {
        if (iteration > 10) {
          const count = (seen.get(next) ?? 0) + 1;
          if (count > 20) {
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
  }];
  #asState(value) {
    return value && typeof value === "object" ? value : null;
  }
  constructor() {
    super(_Tr2StateMachine), _initClass();
  }
}();

export { _Tr2StateMachine as Tr2StateMachine };
//# sourceMappingURL=Tr2StateMachine.js.map
