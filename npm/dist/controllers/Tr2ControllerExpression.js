import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsControllerExpressionProgram } from './CjsControllerExpressionProgram.js';

let _initProto, _initClass, _init_program, _init_extra_program, _init_stateMachine, _init_extra_stateMachine, _init_controller, _init_extra_controller, _init_variableMask, _init_extra_variableMask;

/**
 * Holds one compiled expression bound to a controller or state machine, together
 * with the variable dirty mask that says when it needs re-evaluating.
 */
let _Tr2ControllerExpress;
new class extends _identity {
  static [class Tr2ControllerExpression extends CjsModel {
    static {
      ({
        e: [_init_program, _init_extra_program, _init_stateMachine, _init_extra_stateMachine, _init_controller, _init_extra_controller, _init_variableMask, _init_extra_variableMask, _initProto],
        c: [_Tr2ControllerExpress, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2ControllerExpression",
        family: "controllers"
      })], [[type.rawStruct("CcpParser::Program"), 0, "program"], [type.objectRef("Tr2StateMachine"), 0, "stateMachine"], [type.objectRef("ITr2ActionController"), 0, "controller"], [[type, type.uint64], 16, "variableMask"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetExpr"], [[carbon, carbon.method, impl, impl.adapted], 18, "Eval"], [[carbon, carbon.method, impl, impl.implemented], 18, "Clear"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsExpressionValid"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetVariableMask"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetExpressionTermInfo"]], 0, void 0, CjsModel));
    }
    program = (_initProto(this), _init_program(this, null));
    stateMachine = (_init_extra_program(this), _init_stateMachine(this, null));
    controller = (_init_extra_stateMachine(this), _init_controller(this, null));
    variableMask = (_init_extra_controller(this), _init_variableMask(this, 0n));
    #source = (_init_extra_variableMask(this), "");

    /**
     * Compiles an expression against a state machine or controller.
     */
    SetExpr(expression, source, functions) {
      this.Clear();
      this.#source = expression;
      if (_Tr2ControllerExpress.#isStateMachine(source)) {
        this.stateMachine = source;
        this.controller = source.GetController?.() ?? null;
      } else {
        this.controller = source;
        this.stateMachine = null;
      }
      this.program = CjsControllerExpressionProgram.Compile(expression, {
        emptyValue: 0,
        functions
      });
      this.variableMask = _Tr2ControllerExpress.#getVariableMask(this.program, this.controller);
      return this.program.IsValid() ? "" : this.program.error;
    }

    /**
     * Evaluates the compiled expression.
     */
    Eval(extra = null) {
      if (!this.program || !this.controller) {
        return [false, 0];
      }
      try {
        const owner = this.controller.GetOwner?.() ?? null;
        const runtime = this.controller;
        const context = runtime.GetExpressionContext ? runtime.GetExpressionContext(owner, this.stateMachine, extra ?? {}) : {
          ...(extra ?? {}),
          controller: this.controller,
          owner,
          stateMachine: this.stateMachine
        };
        return [true, Number(this.program.Evaluate(context)) || 0];
      } catch (_err) {
        return [false, 0];
      }
    }

    /**
     * Clears the compiled expression.
     */
    Clear() {
      this.program = null;
      this.stateMachine = null;
      this.controller = null;
      this.variableMask = 0n;
      this.#source = "";
    }

    /**
     * Checks whether the expression compiled successfully.
     */
    IsExpressionValid() {
      return !!this.program?.IsValid();
    }

    /**
     * Gets the variable dirty mask referenced by this expression.
     */
    GetVariableMask() {
      return this.variableMask;
    }

    /**
     * Gets expression term metadata from the linked controller.
     */
    GetExpressionTermInfo(out = []) {
      CjsControllerExpressionProgram.addControllerTermInfo(out);
      return out;
    }

    /**
     * Computes the bitmask of controller variables the program reads; returns 0
     * when the program calls an impure function or references a variable that is
     * missing or beyond bit 63, and -1 when the controller exposes no variable
     * view at all.
     */

    /**
     * Distinguishes a state machine from a controller by the presence of a
     * callable GetController.
     */
  }];
  #getVariableMask(program, controller) {
    const view = controller?.GetVariableView?.();
    if (!Array.isArray(view)) {
      return program.HasNonPureFunctions() ? 0n : -1n;
    }
    let mask = 0n;
    for (const name of program.GetVariableNames()) {
      const index = view.findIndex(entry => !!entry && typeof entry === "object" && "name" in entry && entry.name === name);
      if (index < 0 || index >= 64) {
        return 0n;
      }
      mask |= 1n << BigInt(index);
    }
    return program.HasNonPureFunctions() ? 0n : mask;
  }
  #isStateMachine(value) {
    return !!value && typeof value === "object" && typeof value.GetController === "function";
  }
  OWNER_BUFFER_INDEX = 1;
  STATE_MACHINE_BUFFER_INDEX = 2;
  EXTRA_BUFFER_INDEX = 3;
  constructor() {
    super(_Tr2ControllerExpress), _initClass();
  }
}();

export { _Tr2ControllerExpress as Tr2ControllerExpression };
//# sourceMappingURL=Tr2ControllerExpression.js.map
