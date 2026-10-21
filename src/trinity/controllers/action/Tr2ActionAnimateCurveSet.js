// Source: trinity/trinity/Controllers/Actions/Tr2ActionAnimateCurveSet.h
// Source: trinity/trinity/Controllers/Actions/Tr2ActionAnimateCurveSet.cpp
// Source: trinity/trinity/Controllers/Actions/Tr2ActionAnimateCurveSet_Blue.cpp
import { meta, type, blue } from "#schema";
import { IsMatch, blue as be, INotify } from "#blue";
import { CjsControllerExpressionProgram } from "../expression/CjsControllerExpressionProgram.js";
import { ITr2ControllerAction } from "./ITr2ControllerAction.js";
import { ITr2Updateable } from "../../core/ITr2Updateable.js";


/**
 * Controller action that registers for per-frame updates and drives a curve
 * set's playhead from an expression, by default the elapsed state time.
 */
@blue.define("Tr2ActionAnimateCurveSet")
@blue.inherit(ITr2Updateable, INotify)
@blue.interface(ITr2ControllerAction, ITr2Updateable, INotify)
export class Tr2ActionAnimateCurveSet extends ITr2ControllerAction
{
  /** m_value: expression text, recompiled by Link and its NOTIFY callback. */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.string
  value = "StateTime()";

  /** m_curveSet: the curve set whose playhead this action drives. */
  @blue.readwrite
  @blue.persist
  @type.object.ref("TriCurveSet")
  curveSet = null;

  /** Live readonly validity of the retained expression evaluator. */
  @blue.property()
  @type.boolean
  @meta.adapted
  get isExpressionValid()
  {
    return this._runtime.program !== null && this._runtime.program.IsValid();
  }

  /** AST evaluator cache and timestamps replace native evaluator storage. */
  _runtime = CjsControllerExpressionProgram.createRuntimeState();

  /**
   * Links this action to a controller and compiles its expression.
   * Adapted: a CSP-safe AST program replaces native parser bytecode.
   */

  @meta.adapted
  Link(controller)
  {
    this._runtime.controller = controller;
    this.CompileExpression();
  }

  /**
   * Clears runtime expression state.
   * Adapted: the retained JS cache reset also zeros its timestamps, unlike native
   * Unlink which clears only the controller and evaluator.
   */

  @meta.adapted
  Unlink()
  {
    this._runtime = CjsControllerExpressionProgram.createRuntimeState();
  }

  /**
   * Starts timeline updates for this action.
   * Adapted: retains the JS optional-controller convenience and records the
   * supplied controller and last time; native Start only sets the start time.
   */

  @meta.adapted
  Start(controller = this._runtime.controller)
  {
    if (!controller || !this.curveSet)
    {
      return;
    }
    this._runtime.controller = controller;
    this._runtime.startTime = be.os.GetCurrentFrameTime();
    this._runtime.lastTime = this._runtime.startTime;
    controller.RegisterUpdateable(this);
  }

  /**
   * Stops timeline updates for this action.
   * Adapted: an omitted controller uses the stored JS link; no link is a no-op.
   */

  @meta.adapted
  Stop(controller = this._runtime.controller)
  {
    if (controller) controller.UnRegisterUpdateable(this);
  }

  /**
   * Rebases stored simulation time.
   */

  @meta.implemented
  RebaseSimTime(diff)
  {
    this._runtime.startTime += diff;
    this._runtime.lastTime += diff;
  }

  /**
   * Applies the retained evaluator result to the curve set and records every tick.
   * Adapted: the existing CSP-safe AST context and numeric result conversion
   * represent native expression evaluation. Evaluation errors skip ApplyTime;
   * successful nonfinite results and target errors remain visible. Stored text does not
   * compile during Update; Link or OnModified owns recompilation.
   */

  @meta.adapted
  Update(_realTime, simTime)
  {
    this._runtime.lastTime = simTime;
    if (!this.curveSet) return;
    const controller = this._runtime.controller;
    const program = this._runtime.program;
    if (!program || !program.IsValid()) return;
    let value;
    try
    {
      value = Number(program.Evaluate(CjsControllerExpressionProgram.makeActionContext(controller, ITr2ControllerAction.getOwner(controller), this._runtime, {
        action: this
      })));
    }
    catch
    {
      // Native Eval reports failure separately from a successfully returned float.
      return;
    }
    this.curveSet.ApplyTime(value);
  }

  /**
   * Recompiles when the expression changes.
   */

  @meta.implemented
  OnModified(propertyName)
  {
    if (this._runtime.controller && IsMatch(propertyName, "value"))
    {
      this._runtime.program = null;
      this.CompileExpression();
    }
    return true;
  }

  /**
   * Checks whether the value expression compiles.
   * Adapted: retains the JS explicit lazy-compilation helper. The live property
   * observes the retained evaluator without compiling, as native does.
   */
  @blue.method
  @meta.adapted
  IsExpressionValid()
  {
    return this.CompileExpression().IsValid();
  }

  /**
   * Carbon's Blue arity adapter (Tr2ActionAnimateCurveSet.cpp:99-102): the
   * scripting layer exposes the PROPERTY isExpressionValid AND the METHOD
   * IsExpressionValid(attrName), which cannot share one C++ function, so
   * this forward takes and discards the attribute name. Same forward here
   * for nominal parity.
   */
  @blue.method
  @meta.implemented
  IsAttrExpressionValid(_attributeName)
  {
    return this.IsExpressionValid();
  }

  /**
   * Gets expression term metadata.
   * Adapted: the shared AST adapter supplies term records instead of native
   * Tr2ExpressionTermInfo instances, followed by linked controller records.
   */
  @blue.method
  @meta.adapted
  GetExpressionTermInfo()
  {
    const result = [];
    CjsControllerExpressionProgram.addControllerTermInfo(result);
    if (this._runtime.controller) this._runtime.controller.GetExpressionTermInfo(result);
    return result;
  }

  /**
   * Evaluates an arbitrary expression.
   * Adapted: retains the existing AST convenience return of zero for invalid
   * syntax and permits unlinked evaluation, unlike native BlueStdResult errors.
   */
  @blue.method
  @meta.adapted
  EvaluateExpression(expression)
  {
    const state = {
      program: null,
      source: ""
    };
    const program = CjsControllerExpressionProgram.compileCached(state, expression, 0);
    if (!program.IsValid())
    {
      return 0;
    }
    const controller = this._runtime.controller;
    return Number(program.Evaluate(CjsControllerExpressionProgram.makeActionContext(controller, ITr2ControllerAction.getOwner(controller), this._runtime, {
      action: this
    }))) || 0;
  }

  /**
   * Compiles the authored time expression, reusing the cached program while the
   * expression text is unchanged. This JS-only helper owns the AST cache.
   */
  CompileExpression()
  {
    return CjsControllerExpressionProgram.compileCached(this._runtime, this.value, 0);
  }
}

// Native exposure ends at this concrete table (Tr2ActionAnimateCurveSet_Blue.cpp:13-16,36).
