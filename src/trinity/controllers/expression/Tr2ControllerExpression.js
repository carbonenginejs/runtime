// Source: trinity/trinity/Controllers/Tr2ControllerExpression.h
// Source: trinity/trinity/Controllers/Tr2ControllerExpression.cpp
import { CjsSchema, meta, type, blue } from "#schema";
import { Tr2StateMachine } from "../state/Tr2StateMachine.js";
import { CjsControllerExpressionProgram } from "./CjsControllerExpressionProgram.js";


/**
 * Holds one compiled expression bound to a controller or state machine, together
 * with the variable dirty mask that says when it needs re-evaluating.
 * Native is a plain helper: registration and runtime member descriptions serve
 * existing JavaScript bindings, without a native Blue query table. The AST
 * evaluator adapter and its recorded parser gaps remain unchanged.
 */
@blue.define("Tr2ControllerExpression")
export class Tr2ControllerExpression
{
  /**
   * g_controllerFunctionOverrideEnabled (cpp:18, :23): the ShipSpeed,
   * ShipMaxSpeed and server-time terms read the three settings below instead
   * of the owner and the frame clock.
   */
  @meta.setting("controllerFunctionOverrideEnabled")
  static controllerFunctionOverrideEnabled = false;

  /** g_controllerShipSpeed (cpp:19, :24): ShipSpeed while overriding. */
  @meta.setting("controllerShipSpeed")
  static controllerShipSpeed = 0;

  /** g_controllerShipMaxSpeed (cpp:20, :25): ShipMaxSpeed while overriding. */
  @meta.setting("controllerShipMaxSpeed")
  static controllerShipMaxSpeed = 1;

  /**
   * g_controllerServerTime (cpp:21, :26): the server time while overriding.
   * Blue ticks on the runtime epoch, as every Blue time here; Carbon's is
   * absolute FILETIME (see CcpTime.timeToFileTime).
   */
  @meta.setting("controllerServerTime")
  static controllerServerTime = 0;

  /** Compiled JavaScript parser program; not persisted. */
  @type.rawStruct("CcpParser::Program")
  program = null;

  /** State-machine overload context, or null. */
  @type.rootRef("Tr2StateMachine")
  stateMachine = null;

  /** Action controller whose expression buffer and owner are read. */
  @type.rootRef("ITr2ActionController")
  controller = null;

  /** Cached variable dirty mask used to avoid unnecessary evaluation. */
  @type.uint64
  variableMask = 0n;

  /** Source text retained by the JavaScript parser adapter. */
  _source = "";

  /**
   * Compiles an expression against a state machine or controller.
   * @param {string} expression Source expression.
   * @param {Tr2StateMachine|ITr2ActionController} source Native overload context.
   * @param {object} [functions] Extra JavaScript parser functions.
   * @returns {string} Empty on success, otherwise the compile error.
   */
  @blue.method
  @meta.adapted
  SetExpr(expression, source, functions)
  {
    this.Clear();
    this._source = expression;
    if (Tr2ControllerExpression._isStateMachine(source))
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
    this.variableMask = Tr2ControllerExpression._getVariableMask(this.program, this.controller);
    return this.program.IsValid() ? "" : this.program.error;
  }

  /**
   * Evaluates the compiled expression.
   * Adapted: GetExpressionContext is an optional JavaScript evaluator extension, not a native controller method.
   * @param {object|null} [extra=null] Additional evaluator context.
   * @returns {Array<boolean|number>} Success and numeric result.
   */
  @blue.method
  @meta.adapted
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
   * Adapted: retained JS behavior resets variableMask too; native cpp:577-585
   * leaves that cached mask unchanged. This existing evaluator gap is held.
   * @returns {void}
   */
  @blue.method
  @meta.adapted
  Clear()
  {
    this.program = null;
    this.stateMachine = null;
    this.controller = null;
    this.variableMask = 0n;
    this._source = "";
  }

  /**
   * Checks whether the expression compiled successfully.
   * @returns {boolean} Whether a valid program is retained.
   */
  @blue.method
  @meta.implemented
  IsExpressionValid()
  {
    return !!this.program?.IsValid();
  }

  /**
   * Gets the variable dirty mask referenced by this expression.
   * @returns {bigint} Cached variable bit mask.
   */
  @blue.method
  @meta.adapted
  GetVariableMask()
  {
    return this.variableMask;
  }

  /**
   * Gets expression term metadata from the linked controller.
   * @param {Array} [out=[]] Output metadata list.
   * @returns {Array} The supplied list.
   */
  @blue.method
  @meta.adapted
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
   * Custom: inspects the retained JavaScript AST adapter instead of native parser bytecode.
   * @param {CjsControllerExpressionProgram} program Compiled program.
   * @param {ITr2ActionController|null} controller Bound controller.
   * @returns {bigint} Cached dependency mask.
   */
  static _getVariableMask(program, controller)
  {
    const view = controller?.GetVariableView();
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
   * Selects the native state-machine overload by nominal class identity.
   * Custom: nominal identity selects between C++ overloads in JavaScript.
   * @param {object|null} value Overload argument.
   * @returns {boolean} Whether the state-machine overload applies.
   */
  static _isStateMachine(value)
  {
    return CjsSchema.cast(value, Tr2StateMachine) !== null;
  }

  /** Native parser buffer slot index. */
  static OWNER_BUFFER_INDEX = 1;

  /** Native parser buffer slot index. */
  static STATE_MACHINE_BUFFER_INDEX = 2;

  /** Native parser buffer slot index. */
  static EXTRA_BUFFER_INDEX = 3;
}
