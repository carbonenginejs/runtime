// Source: E:\carbonengine\trinity\trinity\Controllers\Actions\Tr2ActionBindRTPC.h
// Source: E:\carbonengine\trinity\trinity\Controllers\Actions\Tr2ActionBindRTPC.cpp
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsControllerExpressionProgram } from "../expression/CjsControllerExpressionProgram.js";
import { ITr2ControllerAction } from "./ITr2ControllerAction.js";


/**
 * Controller action that registers for per-frame updates and pushes an
 * expression-driven value into a named Wwise real-time parameter on a sound
 * emitter.
 */
@type.define({
  className: "Tr2ActionBindRTPC",
  family: "controllers"
})
export class Tr2ActionBindRTPC extends CjsModel
{
  @io.notify
  @io.persist
  @type.string
  value = "";

  @io.persist
  @type.string
  emitter = "";

  @io.persist
  @type.string
  rtpcName = "";

  @io.persist
  @type.objectRef("ITriScalarFunction")
  curve = null;

  #runtime = CjsControllerExpressionProgram.createRuntimeState();

  #emitter = null;

  /**
   * Links and compiles the RTPC value expression.
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
   * Starts RTPC updates.
   */
  @carbon.method
  @impl.adapted
  Start(controller = this.#runtime.controller)
  {
    if (!controller)
    {
      return;
    }
    this.#runtime.controller = controller;
    this.#runtime.startTime = ITr2ControllerAction.getTime(controller);
    this.#runtime.lastTime = this.#runtime.startTime;
    this.#emitter = ITr2ControllerAction.findSoundEmitter(ITr2ControllerAction.getOwner(controller), this.emitter);
    controller.RegisterUpdateable?.(this);
  }

  /**
   * Starts manually with an explicit controller.
   */
  @carbon.method
  @impl.implemented
  StartWithController(controller)
  {
    this.Start(ITr2ControllerAction.requireController(controller, "StartWithController"));
  }

  /**
   * Stops RTPC updates.
   */
  @carbon.method
  @impl.implemented
  Stop(controller = this.#runtime.controller)
  {
    controller?.UnRegisterUpdateable?.(this);
  }

  /**
   * Stops manually with an explicit controller.
   */
  @carbon.method
  @impl.implemented
  StopWithController(controller)
  {
    this.Stop(ITr2ControllerAction.requireController(controller, "StopWithController"));
  }

  /**
   * Updates the target RTPC value.
   */
  @carbon.method
  @impl.adapted
  Update(_realTime, simTime)
  {
    const controller = this.#runtime.controller;
    if (!controller)
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
    if (ITr2ControllerAction.hasFunction(this.#emitter, "SetRTPC"))
    {
      this.#emitter.SetRTPC(this.rtpcName, value);
    }
  }

  /**
   * Recompiles when authored fields change.
   */
  @carbon.method
  @impl.adapted
  OnModified(_options = {})
  {
    this.#runtime.program = null;
    return true;
  }

  /**
   * Checks whether the expression compiles.
   */
  @carbon.method
  @impl.implemented
  IsExpressionValid()
  {
    return this.CompileExpression().IsValid();
  }

  /**
   * Gets a curve value for expression helpers.
   */
  @carbon.method
  @impl.adapted
  GetCurveValue(time)
  {
    return CjsControllerExpressionProgram.getCurveValue(this.curve, time);
  }

  /**
   * Gets expression term metadata from the linked controller.
   */
  @carbon.method
  @impl.adapted
  GetExpressionTermInfo()
  {
    const result = [];
    CjsControllerExpressionProgram.addControllerTermInfo(result, {
      curve: true
    });
    this.#runtime.controller?.GetExpressionTermInfo?.(result);
    return result;
  }

  /**
   * Evaluates an expression against this action's controller context.
   */
  @carbon.method
  @impl.adapted
  EvaluateExpression(expression)
  {
    const state = {
      program: null,
      source: ""
    };
    const program = CjsControllerExpressionProgram.compileCached(state, expression, 0, {
      Curve: (_ctx, time) => this.GetCurveValue(Number(time))
    });
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
   * Compiles the authored value expression with the `Curve` function bound to
   * this action's curve, reusing the cached program while the text is unchanged.
   */
  CompileExpression()
  {
    return CjsControllerExpressionProgram.compileCached(this.#runtime, this.value, 0, {
      Curve: (_ctx, time) => this.GetCurveValue(Number(time))
    });
  }
}
