// Source: trinity/trinity/Controllers/Tr2ControllerExpression.h
// Source: trinity/trinity/Controllers/Tr2ControllerExpression.cpp
import { CjsModel } from "#model";
import { carbon, impl, type } from "#schema";
import { CjsControllerExpressionProgram } from "./CjsControllerExpressionProgram.js";


/**
 * Holds one compiled expression bound to a controller or state machine, together
 * with the variable dirty mask that says when it needs re-evaluating.
 */
@type.define({
  className: "Tr2ControllerExpression",
  family: "controllers"
})
export class Tr2ControllerExpression extends CjsModel
{
  @type.rawStruct("CcpParser::Program")
  program = null;

  @type.objectRef("Tr2StateMachine")
  stateMachine = null;

  @type.objectRef("ITr2ActionController")
  controller = null;

  @type.uint64
  variableMask = 0n;

  #source = "";

  /**
   * Compiles an expression against a state machine or controller.
   */
  @carbon.method
  @impl.adapted
  SetExpr(expression, source, functions)
  {
    this.Clear();
    this.#source = expression;
    if (Tr2ControllerExpression.#isStateMachine(source))
    {
      this.stateMachine = source;
      this.controller = source.GetController() ?? null;
    }
    else
    {
      this.controller = source;
      this.stateMachine = null;
    }
    this.program = CjsControllerExpressionProgram.Compile(expression, {
      emptyValue: 0,
      functions
    });
    this.variableMask = Tr2ControllerExpression.#getVariableMask(this.program, this.controller);
    return this.program.IsValid() ? "" : this.program.error;
  }

  /**
   * Evaluates the compiled expression.
   */
  @carbon.method
  @impl.adapted
  Eval(extra = null)
  {
    if (!this.program || !this.controller)
    {
      return [false, 0];
    }
    try
    {
      const owner = this.controller.GetOwner() ?? null;
      const runtime = this.controller;
      const context = runtime.GetExpressionContext ? runtime.GetExpressionContext(owner, this.stateMachine, extra ?? {}) : {
        ...(extra ?? {}),
        controller: this.controller,
        owner,
        stateMachine: this.stateMachine
      };
      return [true, Number(this.program.Evaluate(context)) || 0];
    }
    catch (_err)
    {
      return [false, 0];
    }
  }

  /**
   * Clears the compiled expression.
   */
  @carbon.method
  @impl.implemented
  Clear()
  {
    this.program = null;
    this.stateMachine = null;
    this.controller = null;
    this.variableMask = 0n;
    this.#source = "";
  }

  /**
   * Checks whether the expression compiled successfully.
   */
  @carbon.method
  @impl.implemented
  IsExpressionValid()
  {
    return !!this.program?.IsValid();
  }

  /**
   * Gets the variable dirty mask referenced by this expression.
   */
  @carbon.method
  @impl.adapted
  GetVariableMask()
  {
    return this.variableMask;
  }

  /**
   * Gets expression term metadata from the linked controller.
   */
  @carbon.method
  @impl.adapted
  GetExpressionTermInfo(out = [])
  {
    CjsControllerExpressionProgram.addControllerTermInfo(out);
    return out;
  }

  /**
   * Computes the bitmask of controller variables the program reads; returns 0
   * when the program calls an impure function or references a variable that is
   * missing or beyond bit 63, and -1 when the controller exposes no variable
   * view at all.
   */
  static #getVariableMask(program, controller)
  {
    const view = controller?.GetVariableView?.();
    if (!Array.isArray(view))
    {
      return program.HasNonPureFunctions() ? 0n : -1n;
    }
    let mask = 0n;
    for (const name of program.GetVariableNames())
    {
      const index = view.findIndex(entry => !!entry && typeof entry === "object" && "name" in entry && entry.name === name);
      if (index < 0 || index >= 64)
      {
        return 0n;
      }
      mask |= 1n << BigInt(index);
    }
    return program.HasNonPureFunctions() ? 0n : mask;
  }

  /**
   * Distinguishes a state machine from a controller by the presence of a
   * callable GetController.
   */
  static #isStateMachine(value)
  {
    return !!value && typeof value === "object" && typeof value.GetController === "function";
  }

  static OWNER_BUFFER_INDEX = 1;

  static STATE_MACHINE_BUFFER_INDEX = 2;

  static EXTRA_BUFFER_INDEX = 3;
}
