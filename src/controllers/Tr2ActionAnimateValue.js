// Source: E:\carbonengine\trinity\trinity\Controllers\Actions\Tr2ActionAnimateValue.h
// Source: E:\carbonengine\trinity\trinity\Controllers\Actions\Tr2ActionAnimateValue.cpp
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsControllerExpressionProgram } from "./CjsControllerExpressionProgram.js";
import { ITr2ControllerAction } from "./ITr2ControllerAction.js";
import { Tr2BindingPoint } from "./Tr2BindingPoint.js";


/**
 * Controller action that registers for per-frame updates and continuously writes
 * an expression-driven value, by default the action's curve sampled at state
 * time, into a bound destination property.
 */
@type.define({
  className: "Tr2ActionAnimateValue",
  family: "controllers"
})
export class Tr2ActionAnimateValue extends CjsModel
{
  @io.persist
  @type.objectRef("ITriScalarFunction")
  curve = null;

  @io.notify
  @io.persist
  @type.string
  attribute = "";

  @io.notify
  @io.persist
  @type.objectRef("IRoot")
  destination = null;

  @io.notify
  @io.persist
  @type.boolean
  delayBinding = false;

  @io.notify
  @io.persist
  @type.string
  path = "";

  @io.notify
  @io.persist
  @type.string
  value = "Curve(StateTime())";

  #bindingPoint = null;

  #runtime = CjsControllerExpressionProgram.createRuntimeState();

  /**
   * Links the destination and compiles the value expression.
   */
  @carbon.method
  @impl.adapted
  Link(controller)
  {
    this.#runtime.controller = controller;
    if (!this.HasDelayedBinding())
    {
      this.LinkDestination(controller);
    }
    this.CompileExpression();
  }

  /**
   * Unlinks the destination and update registration.
   */
  @carbon.method
  @impl.implemented
  Unlink()
  {
    this.#bindingPoint?.Unlink();
    this.#runtime = CjsControllerExpressionProgram.createRuntimeState();
  }

  /**
   * Starts updating the destination value.
   */
  @carbon.method
  @impl.adapted
  Start(controller = this.#runtime.controller)
  {
    if (!controller)
    {
      return;
    }
    const owner = ITr2ControllerAction.getOwner(controller);
    this.#runtime.controller = controller;
    if (this.HasDelayedBinding() || !this.IsBindingValid())
    {
      this.LinkDestination(controller, owner);
    }
    if (!this.IsBindingValid())
    {
      return;
    }
    this.#runtime.startTime = ITr2ControllerAction.getTime(controller);
    this.#runtime.lastTime = this.#runtime.startTime;
    controller.RegisterUpdateable?.(this);
  }

  /**
   * Stops updating the destination value.
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
   * Evaluates and writes the animated value.
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
    if (!program.IsValid() || !this.IsBindingValid())
    {
      return;
    }
    this.GetBindingPoint().SetValue(program.Evaluate(CjsControllerExpressionProgram.makeActionContext(controller, ITr2ControllerAction.getOwner(controller), this.#runtime, {
      action: this
    })), controller, ITr2ControllerAction.getOwner(controller));
  }

  /**
   * Handles authored field changes.
   */
  @carbon.method
  @impl.adapted
  OnModified(_options = {})
  {
    this.#runtime.program = null;
    if (this.#runtime.controller && !this.HasDelayedBinding())
    {
      this.LinkDestination(this.#runtime.controller);
    }
    return true;
  }

  /**
   * Checks whether the binding currently resolves.
   */
  @carbon.method
  @impl.implemented
  IsBindingValid()
  {
    return !!this.#bindingPoint?.IsValid();
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
   * Gets a curve value for the expression helper.
   */
  @carbon.method
  @impl.adapted
  GetCurveValue(time)
  {
    return CjsControllerExpressionProgram.getCurveValue(this.curve, time);
  }

  /**
   * Gets the bound destination object.
   */
  @carbon.method
  @impl.implemented
  GetDestination(controller = this.#runtime.controller, owner = ITr2ControllerAction.getOwner(controller))
  {
    return this.GetBindingPoint().GetBoundObject(controller, owner);
  }

  /**
   * Gets expression term metadata.
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

  /**
   * Gets the lazily created binding point, refreshing it from the currently
   * authored path, destination object and attribute on every call.
   */
  GetBindingPoint()
  {
    if (!this.#bindingPoint)
    {
      this.#bindingPoint = new Tr2BindingPoint();
    }
    this.#bindingPoint.path = this.path;
    this.#bindingPoint.object = this.destination;
    this.#bindingPoint.attribute = this.attribute;
    return this.#bindingPoint;
  }

  /**
   * Resolves the binding point against the controller's binding roots and its
   * owner.
   */
  LinkDestination(controller = this.#runtime.controller, owner = ITr2ControllerAction.getOwner(controller))
  {
    return this.GetBindingPoint().Link(controller, owner);
  }

  /**
   * Checks whether binding is deferred to Start, which requires both the
   * delayBinding flag and an authored path.
   */
  HasDelayedBinding()
  {
    return this.delayBinding && !!this.path;
  }
}
