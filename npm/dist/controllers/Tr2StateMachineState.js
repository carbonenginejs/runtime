import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { UnlinkReason } from './enums.js';
import { TR2_DIRTY_ALL, BELIST_EVENTMASK, BELIST_REMOVED, BELIST_INSERTED } from './contracts.js';

let _initProto, _initClass, _init_actions, _init_extra_actions, _init_transitions, _init_extra_transitions, _init_finalizer, _init_extra_finalizer, _init_name, _init_extra_name;

/**
 * One state of a Tr2StateMachine: starts and stops its action list on entry and
 * exit, and evaluates its outgoing transitions each update to decide the next
 * state.
 */
let _Tr2StateMachineState;
new class extends _identity {
  static [class Tr2StateMachineState extends CjsModel {
    static {
      ({
        e: [_init_actions, _init_extra_actions, _init_transitions, _init_extra_transitions, _init_finalizer, _init_extra_finalizer, _init_name, _init_extra_name, _initProto],
        c: [_Tr2StateMachineState, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2StateMachineState",
        family: "controllers"
      })], [[[io, io.persist, void 0, type.list("ITr2ControllerAction")], 16, "actions"], [[io, io.persist, void 0, type.list("Tr2StateMachineTransition")], 16, "transitions"], [[io, io.notify, io, io.persist, void 0, type.objectRef("ITr2StateMachineStateFinalizer")], 16, "finalizer"], [[io, io.persist, type, type.string], 16, "name"], [[carbon, carbon.method, impl, impl.implemented], 18, "OnModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "OnListModified"], [[carbon, carbon.method, impl, impl.adapted], 18, "Link"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateVariableMask"], [[carbon, carbon.method, impl, impl.implemented], 18, "Unlink"], [[carbon, carbon.method, impl, impl.adapted], 18, "Start"], [[carbon, carbon.method, impl, impl.adapted], 18, "Stop"], [[carbon, carbon.method, impl, impl.adapted], 18, "Update"], [[carbon, carbon.method, impl, impl.implemented], 18, "RebaseSimTime"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetStateMachine"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetName"]], 0, void 0, CjsModel));
    }
    actions = (_initProto(this), _init_actions(this, []));
    transitions = (_init_extra_actions(this), _init_transitions(this, []));
    finalizer = (_init_extra_transitions(this), _init_finalizer(this, null));
    name = (_init_extra_finalizer(this), _init_name(this, ""));
    #stateMachine = (_init_extra_name(this), null);
    #isActive = false;
    #isFinalizing = false;
    #hasBeenVetoed = false;
    #transitionVariableMask = 0n;

    /**
     * Relinks the finalizer after it is modified.
     */
    OnModified(_options = {}) {
      const controller = this.#stateMachine?.GetController?.() ?? null;
      if (this.finalizer && controller) {
        this.finalizer.Link?.(controller);
      }
      return true;
    }

    /**
     * Handles Carbon list notifications for action and transition lists.
     */
    OnListModified(event, _key = 0, _key2 = 0, value = null, list = null) {
      if (list === this.actions) {
        this.#onActionListModified(event, value);
      } else if (list === this.transitions) {
        this.#onTransitionListModified(event, value);
      }
    }

    /**
     * Links transitions, actions, and the finalizer to a state machine.
     */
    Link(stateMachine) {
      this.Unlink();
      this.#stateMachine = stateMachine;
      this.UpdateVariableMask();
      for (const transition of this.transitions) {
        transition.Link?.(this);
      }
      this.UpdateVariableMask();
      const controller = this.#getController();
      if (controller) {
        for (const action of this.actions) {
          action.Link?.(controller);
        }
        this.finalizer?.Link?.(controller);
      }
    }

    /**
     * Recomputes the combined transition variable mask.
     */
    UpdateVariableMask() {
      this.#transitionVariableMask = 0n;
      let hasMask = true;
      for (const transition of this.transitions) {
        const mask = _Tr2StateMachineState.#toBigIntMask(transition.GetVariableMask?.() ?? 0n);
        if (mask === 0n) {
          hasMask = false;
        } else {
          this.#transitionVariableMask |= mask;
        }
      }
      if (!hasMask) {
        this.#transitionVariableMask = 0n;
      }
    }

    /**
     * Unlinks transitions, actions, and the finalizer.
     */
    Unlink(reason = UnlinkReason.UNLINKING) {
      if (!this.#stateMachine) {
        return;
      }
      if (reason !== UnlinkReason.DELETING) {
        this.Stop();
      }
      this.#stateMachine = null;
      for (const transition of this.transitions) {
        transition.Unlink?.();
      }
      for (const action of this.actions) {
        action.Unlink?.();
      }
      this.finalizer?.Unlink?.();
    }

    /**
     * Starts all actions.
     */
    Start(controller = this.#getController()) {
      if (this.#isActive) {
        return;
      }
      if (!controller) {
        return;
      }
      for (const action of this.actions) {
        action.Start?.(controller);
      }
      this.#isActive = true;
      this.#isFinalizing = false;
      this.#hasBeenVetoed = false;
    }

    /**
     * Stops all actions.
     */
    Stop(controller = this.#getController()) {
      if (!this.#isActive || this.#isFinalizing) {
        return;
      }
      if (controller) {
        for (const action of this.actions) {
          action.Stop?.(controller);
        }
      }
      if (this.finalizer && controller && !this.finalizer.CanTransition(controller)) {
        this.#isFinalizing = true;
        return;
      }
      this.#isActive = false;
    }

    /**
     * Updates transitions and returns the next state when one activates.
     */
    Update(dirtyVariables = 0n) {
      if (!this.#isActive) {
        return null;
      }
      const controller = this.#getController();
      if (!controller) {
        return null;
      }
      if (this.#isFinalizing) {
        const next = this.#getNextState();
        if (!next) {
          this.#isActive = false;
          this.Start(controller);
        }
        if (!this.finalizer || this.finalizer.CanTransition(controller)) {
          return next;
        }
        return null;
      }
      if (this.#hasBeenVetoed) {
        dirtyVariables = TR2_DIRTY_ALL;
      }
      if (this.#transitionVariableMask !== 0n && !_Tr2StateMachineState.#dirtyMaskMatches(this.#transitionVariableMask, dirtyVariables)) {
        return null;
      }
      for (const transition of this.transitions) {
        const destination = transition.GetDestination?.() ?? null;
        const canTransition = transition.CanActivate?.(dirtyVariables) ?? false;
        if (canTransition && destination) {
          for (const action of this.actions) {
            if (action.CanTransition && !action.CanTransition()) {
              this.#hasBeenVetoed = true;
              return null;
            }
          }
          this.Stop(controller);
          if (this.#isFinalizing) {
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
    RebaseSimTime(diff) {
      for (const action of this.actions) {
        action.RebaseSimTime?.(diff);
      }
    }

    /**
     * Gets the linked state machine.
     */
    GetStateMachine() {
      return this.#stateMachine;
    }

    /**
     * Gets the authored state name.
     */
    GetName() {
      return this.name;
    }

    /**
     * Checks whether actions and the finalizer allow transition.
     */
    CanTransition(controller = this.#getController()) {
      for (const action of this.actions) {
        if (action.CanTransition && !action.CanTransition()) {
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
    #getNextState() {
      for (const transition of this.transitions) {
        const destination = transition.GetDestination?.() ?? null;
        if (transition.CanActivate?.(TR2_DIRTY_ALL) && destination) {
          return destination;
        }
      }
      return null;
    }

    /**
     * Gets the controller through the linked state machine, or null when this
     * state is unlinked.
     */
    #getController() {
      return this.#stateMachine?.GetController?.() ?? null;
    }

    /**
     * Links and starts an inserted action when the state is already active, or
     * stops and unlinks a removed one.
     */
    #onActionListModified(event, value) {
      const action = _Tr2StateMachineState.#asAction(value);
      const controller = this.#getController();
      switch (event & BELIST_EVENTMASK) {
        case BELIST_INSERTED:
          if (controller && action) {
            action.Link?.(controller);
            if (this.#isActive) {
              action.Start?.(controller);
            }
          }
          break;
        case BELIST_REMOVED:
          if (action) {
            if (controller && this.#isActive) {
              action.Stop?.(controller);
            }
            action.Unlink?.();
          }
          break;
      }
    }

    /**
     * Links or unlinks a transition as the list changes and recomputes the
     * combined variable mask, which gates whether Update evaluates transitions at
     * all.
     */
    #onTransitionListModified(event, value) {
      const transition = _Tr2StateMachineState.#asTransition(value);
      switch (event & BELIST_EVENTMASK) {
        case BELIST_INSERTED:
          if (this.#stateMachine && transition) {
            transition.Link?.(this);
            this.UpdateVariableMask();
          }
          break;
        case BELIST_REMOVED:
          if (transition) {
            transition.Unlink?.();
            this.UpdateVariableMask();
          }
          break;
      }
    }

    /**
     * Narrows a list payload to an object reference before it is treated as an
     * action.
     */

    /**
     * Narrows a list payload to an object reference before it is treated as a
     * transition.
     */

    /**
     * Coerces a variable mask to BigInt so masks from different sources can be
     * combined exactly.
     */

    /**
     * Checks whether any variable this state's transitions depend on is marked
     * dirty this frame.
     */
  }];
  #asAction(value) {
    return value && typeof value === "object" ? value : null;
  }
  #asTransition(value) {
    return value && typeof value === "object" ? value : null;
  }
  #toBigIntMask(value) {
    return typeof value === "bigint" ? value : BigInt(value);
  }
  #dirtyMaskMatches(mask, dirtyVariables) {
    return (mask & _Tr2StateMachineState.#toBigIntMask(dirtyVariables)) !== 0n;
  }
  constructor() {
    super(_Tr2StateMachineState), _initClass();
  }
}();

export { _Tr2StateMachineState as Tr2StateMachineState };
//# sourceMappingURL=Tr2StateMachineState.js.map
