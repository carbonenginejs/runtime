// Source: trinity/trinity/Controllers/Actions/Tr2ActionAnimateCurveSet.h
// Source: trinity/trinity/Controllers/Actions/Tr2ActionAnimateCurveSet.cpp
import { CjsModel } from "#model";
import { carbon, impl, io, type } from "#schema";
import { CjsControllerExpressionProgram } from "../expression/CjsControllerExpressionProgram.js";
import { ITr2ControllerAction, withITr2ControllerAction } from "./ITr2ControllerAction.js";


/**
 * Controller action that registers for per-frame updates and drives a curve
 * set's playhead from an expression, by default the elapsed state time.
 */
@type.define({
  className: "Tr2ActionAnimateCurveSet",
  family: "controllers"
})
export class Tr2ActionAnimateCurveSet extends withITr2ControllerAction(CjsModel)
{
  @io.persist
  @type.objectRef("TriCurveSet")
  curveSet = null;

  @io.notify
  @io.persist
  @type.string
  value = "StateTime()";

  #runtime = CjsControllerExpressionProgram.createRuntimeState();

  /**
   * Links this action to a controller.
   */
  @carbon.method
  @impl.adapted
  Link(controller)
  {
    this.#runtime.controller = controller;
    this.CompileExpression();
  }

  /**
   * Clears runtime expression state.
   */
  @carbon.method
  @impl.implemented
  Unlink()
  {
    this.#runtime = CjsControllerExpressionProgram.createRuntimeState();
  }

  /**
   * Starts timeline updates for this action.
   */
  @carbon.method
  @impl.adapted
  Start(controller = this.#runtime.controller)
  {
    if (!controller || !this.curveSet)
    {
      return;
    }
    this.#runtime.controller = controller;
    this.#runtime.startTime = ITr2ControllerAction.getTime(controller);
    this.#runtime.lastTime = this.#runtime.startTime;
    controller.RegisterUpdateable?.(this);
  }

  /**
   * Stops timeline updates for this action.
   */
  @carbon.method
  @impl.implemented
  Stop(controller = this.#runtime.controller)
  {
    controller?.UnRegisterUpdateable?.(this);
  }

  /**
   * Rebases stored simulation time.
   */
  @carbon.method
  @impl.implemented
  RebaseSimTime(diff)
  {
    this.#runtime.startTime += diff;
    this.#runtime.lastTime += diff;
  }

  /**
   * Applies the evaluated time to the curve set.
   */
  @carbon.method
  @impl.adapted
  Update(_realTime, simTime)
  {
    const controller = this.#runtime.controller;
    if (!controller || !this.curveSet)
    {
      return;
    }
    this.#runtime.lastTime = simTime;
    const program = this.CompileExpression();
    if (!program.IsValid())
    {
      return;
    }
    const value = Number(program.Evaluate(CjsControllerExpressionProgram.makeActionContext(controller, ITr2ControllerAction.getOwner(controller), this.#runtime, {
      action: this
    }))) || 0;
    this.curveSet.ApplyTime?.(value);
  }

  /**
   * Recompiles when the expression changes.
   */
  @carbon.method
  @impl.adapted
  OnModified(_options = {})
  {
    this.#runtime.program = null;
    return true;
  }

  /**
   * Checks whether the value expression compiles.
   */
  @carbon.method
  @impl.implemented
  IsExpressionValid()
  {
    return this.CompileExpression().IsValid();
  }

  /**
   * Gets expression term metadata.
   */
  @carbon.method
  @impl.adapted
  GetExpressionTermInfo()
  {
    const result = [];
    CjsControllerExpressionProgram.addControllerTermInfo(result);
    this.#runtime.controller?.GetExpressionTermInfo?.(result);
    return result;
  }

  /**
   * Evaluates an arbitrary expression.
   */
  @carbon.method
  @impl.adapted
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
    const controller = this.#runtime.controller;
    return Number(program.Evaluate(CjsControllerExpressionProgram.makeActionContext(controller, ITr2ControllerAction.getOwner(controller), this.#runtime, {
      action: this
    }))) || 0;
  }

  /**
   * Compiles the authored time expression, reusing the cached program while the
   * expression text is unchanged.
   */
  CompileExpression()
  {
    return CjsControllerExpressionProgram.compileCached(this.#runtime, this.value, 0);
  }
}
