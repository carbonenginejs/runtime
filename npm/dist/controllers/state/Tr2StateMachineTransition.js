import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsControllerExpressionProgram } from '../expression/CjsControllerExpressionProgram.js';

let _initProto, _initClass, _init_condition, _init_extra_condition, _init_name, _init_extra_name;

/**
 * One outgoing edge of a state machine state: evaluates a boolean condition
 * expression and, when it passes, names the destination state to switch to.
 */
let _Tr2StateMachineTrans;
new class extends _identity {
  static [class Tr2StateMachineTransition extends CjsModel {
    static {
      ({
        e: [_init_condition, _init_extra_condition, _init_name, _init_extra_name, _initProto],
        c: [_Tr2StateMachineTrans, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2StateMachineTransition",
        family: "controllers"
      })], [[[io, io.notify, io, io.persist, type, type.string], 16, "condition"], [[io, io.notify, io, io.persist, type, type.string], 16, "name"], [[carbon, carbon.method, impl, impl.adapted], 18, "Link"], [[carbon, carbon.method, impl, impl.adapted], 18, "Unlink"], [[carbon, carbon.method, impl, impl.adapted], 18, "OnModified"], [[carbon, carbon.method, impl, impl.adapted], 18, "CanActivate"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetDestination"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetSource"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetState"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetVariableMask"], [[carbon, carbon.method, impl, impl.adapted], 18, "IsConditionValid"], [[carbon, carbon.method, impl, impl.adapted], 18, "IsExpressionValid"], [[carbon, carbon.method, impl, impl.adapted], 18, "EvaluateExpression"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetExpressionTermInfo"]], 0, void 0, CjsModel));
    }
    condition = (_initProto(this), _init_condition(this, ""));
    name = (_init_extra_condition(this), _init_name(this, ""));
    #source = (_init_extra_name(this), null);
    #destination = null;
    #program = null;
    #programSource = null;
    #variableNames = [];
    #functionNames = [];
    #isConditionValid = false;

    /**
     * Links this transition to its source state.
     */
    Link(state) {
      this.Unlink();
      this.#source = state;
      this.#destination = this.#resolveDestination();
    }

    /**
     * Unlinks this transition from its source state.
     */
    Unlink() {
      this.#source = null;
      this.#destination = null;
      this.#program = null;
      this.#programSource = null;
      this.#variableNames = [];
      this.#functionNames = [];
    }

    /**
     * Refreshes cached destination/expression state after modification.
     */
    OnModified(_options = {}) {
      this.#destination = this.#resolveDestination();
      this.#program = null;
      this.#programSource = null;
      this.#variableNames = [];
      this.#functionNames = [];
      this.#source?.UpdateVariableMask?.();
      return true;
    }

    /**
     * Compiles and caches the transition condition.
     */
    Compile() {
      if (!this.#program || this.#programSource !== this.condition) {
        this.#program = CjsControllerExpressionProgram.Compile(this.condition, {
          emptyValue: 1
        });
        this.#programSource = this.condition;
        this.#variableNames = this.#program.GetVariableNames();
        this.#functionNames = this.#program.GetFunctionNames();
        this.#isConditionValid = this.#program.IsValid();
      }
      return this.#program;
    }

    /**
     * Carbon-compatible alias for transition activation.
     */
    CanActivate(variableDirtyMask = 0) {
      const stateMachine = this.#source?.GetStateMachine?.() ?? null;
      const controller = stateMachine?.GetController?.() ?? null;
      const owner = controller?.GetOwner?.() ?? null;
      const program = this.Compile();
      if (!program.IsValid()) {
        return false;
      }
      if (!_Tr2StateMachineTrans.#dirtyMaskMatches(this.GetVariableMask(), variableDirtyMask)) {
        return false;
      }
      const context = this.#getExpressionContext(controller, owner, stateMachine);
      return program.EvaluateBoolean(context);
    }

    /**
     * Gets this transition's destination state by name.
     */
    GetDestination() {
      return this.#destination ?? this.#resolveDestination();
    }

    /**
     * Gets the source state.
     */
    GetSource() {
      return this.#source;
    }

    /**
     * Gets the source state.
     */
    GetState() {
      return this.GetSource();
    }

    /**
     * Gets the bitmask of controller variables this condition reads, so the owning
     * state can skip evaluation when none of them changed; returns 0 (never skip)
     * when the condition calls an impure function or references a variable that is
     * missing or beyond the 64-bit mask.
     */
    GetVariableMask() {
      const program = this.Compile();
      if (program.HasNonPureFunctions()) {
        return 0n;
      }
      const stateMachine = this.#source?.GetStateMachine?.() ?? null;
      const controller = stateMachine?.GetController?.() ?? null;
      const variableView = controller?.GetVariableView?.();
      if (!Array.isArray(variableView)) {
        return 0n;
      }
      let mask = 0n;
      for (const name of this.#variableNames) {
        const index = variableView.find(variable => variable && typeof variable === "object" && "name" in variable && String(variable.name) === name)?.index;
        if (typeof index !== "number" || index < 0 || index >= 64) {
          return 0n;
        }
        mask |= 1n << BigInt(index);
      }
      return mask;
    }

    /**
     * Checks whether the condition is valid.
     */
    IsConditionValid() {
      return this.Compile().IsValid();
    }

    /**
     * Checks whether the condition expression is valid.
     */
    IsExpressionValid() {
      return this.IsConditionValid();
    }

    /**
     * Evaluates an arbitrary expression against this transition's current context.
     */
    EvaluateExpression(expression) {
      const stateMachine = this.#source?.GetStateMachine?.() ?? null;
      const controller = stateMachine?.GetController?.() ?? null;
      const owner = controller?.GetOwner?.() ?? null;
      const program = CjsControllerExpressionProgram.Compile(expression, {
        emptyValue: 0
      });
      if (!program.IsValid()) {
        return 0;
      }
      return Number(program.Evaluate(this.#getExpressionContext(controller, owner, stateMachine)));
    }

    /**
     * Gets expression term metadata known by the linked controller.
     */
    GetExpressionTermInfo() {
      const result = [];
      CjsControllerExpressionProgram.addControllerTermInfo(result);
      const controller = this.#source?.GetStateMachine?.()?.GetController?.();
      controller?.GetExpressionTermInfo?.(result);
      return result;
    }

    /**
     * Gets variable names referenced by the compiled condition.
     */
    GetVariableNames() {
      this.Compile();
      return this.#variableNames.slice();
    }

    /**
     * Gets function names referenced by the compiled condition.
     */
    GetFunctionNames() {
      this.Compile();
      return this.#functionNames.slice();
    }

    /**
     * Builds the condition evaluation context, delegating to the controller's own
     * GetExpressionContext when it has one and otherwise assembling controller,
     * owner and state machine directly.
     */
    #getExpressionContext(controller, owner, stateMachine) {
      const runtime = controller;
      if (runtime?.GetExpressionContext) {
        return runtime.GetExpressionContext(owner, stateMachine);
      }
      return {
        controller: runtime ?? undefined,
        owner: owner ?? undefined,
        stateMachine: stateMachine
      };
    }

    /**
     * Looks up the destination state by this transition's `name` on the source
     * state's machine; the authored name is the destination state name, not a
     * label for the edge.
     */
    #resolveDestination() {
      const stateMachine = this.#source?.GetStateMachine?.() ?? null;
      if (!stateMachine || !this.name) {
        return null;
      }
      return stateMachine.GetStateByName?.(this.name) ?? null;
    }

    /**
     * Checks whether any variable this condition reads is dirty; an empty variable
     * mask means the condition must always be evaluated.
     */
  }];
  #dirtyMaskMatches(variableMask, dirtyVariables) {
    if (variableMask === 0n) {
      return true;
    }
    const dirtyMask = typeof dirtyVariables === "bigint" ? dirtyVariables : BigInt(dirtyVariables);
    return (variableMask & dirtyMask) !== 0n;
  }
  constructor() {
    super(_Tr2StateMachineTrans), _initClass();
  }
}();

export { _Tr2StateMachineTrans as Tr2StateMachineTransition };
//# sourceMappingURL=Tr2StateMachineTransition.js.map
