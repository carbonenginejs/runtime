// Source: trinity/trinity/Controllers/Actions/Tr2ActionSetValue.h
// Source: trinity/trinity/Controllers/Actions/Tr2ActionSetValue.cpp
import { CjsModel } from "#model";
import { carbon, impl, io, type } from "#schema";
import { CjsControllerExpressionProgram } from "../expression/CjsControllerExpressionProgram.js";
import { ITr2ControllerAction } from "./ITr2ControllerAction.js";
import { Tr2BindingPoint } from "../expression/Tr2BindingPoint.js";


/**
 * Controller action that evaluates a value expression once on start and writes
 * the result into a bound destination property.
 */
@type.define({
  className: "Tr2ActionSetValue",
  family: "controllers"
})
export class Tr2ActionSetValue extends CjsModel
{
  @io.notify
  @io.persist
  @type.string
  value = "";

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

  #bindingPoint = null;

  #expression = {
    program: null,
    source: ""
  };
  #controller = null;

  /**
   * Links the destination when this action does not use delayed binding.
   */
  @carbon.method
  @impl.adapted
  Link(controller)
  {
    this.#controller = controller;
    if (!this.HasDelayedBinding())
    {
      this.LinkDestination(controller);
    }
    this.CompileExpression();
  }

  /**
   * Unlinks the destination binding.
   */
  @carbon.method
  @impl.implemented
  Unlink()
  {
    this.#bindingPoint?.Unlink();
    this.#expression = {
      program: null,
      source: ""
    };
    this.#controller = null;
  }

  /**
   * Evaluates the value expression and writes it to the destination binding.
   */
  @carbon.method
  @impl.adapted
  Start(controller = this.#controller)
  {
    if (!controller)
    {
      return;
    }
    const owner = ITr2ControllerAction.getOwner(controller);
    this.#controller = controller;
    if (this.HasDelayedBinding())
    {
      this.LinkDestination(controller, owner);
    }
    if (!this.IsBindingValid())
    {
      return;
    }
    const value = this.#evaluateValue(controller, owner);
    if (value === null)
    {
      return;
    }
    this.GetBindingPoint().SetValue(value, controller, owner);
  }

  /**
   * Relinks or recompiles when authored fields change.
   */
  @carbon.method
  @impl.adapted
  OnModified(_options = {})
  {
    this.#expression.program = null;
    if (this.#controller && !this.HasDelayedBinding())
    {
      this.LinkDestination(this.#controller);
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
   * Gets the bound destination object.
   */
  @carbon.method
  @impl.implemented
  GetDestination(controller = this.#controller, owner = ITr2ControllerAction.getOwner(controller))
  {
    return this.GetBindingPoint().GetBoundObject(controller, owner);
  }

  /**
   * Gets expression term metadata from the linked controller.
   */
  @carbon.method
  @impl.adapted
  GetExpressionTermInfo()
  {
    const result = [];
    CjsControllerExpressionProgram.addControllerTermInfo(result);
    this.#controller?.GetExpressionTermInfo?.(result);
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
    const program = CjsControllerExpressionProgram.compileCached(state, expression, 0);
    if (!program.IsValid())
    {
      return 0;
    }
    const controller = this.#controller;
    const owner = ITr2ControllerAction.getOwner(controller);
    const runtime = controller;
    return Number(program.Evaluate(runtime?.GetExpressionContext?.(owner, null, {
      action: this
    }) ?? {
      controller: controller ?? undefined,
      owner,
      action: this
    })) || 0;
  }

  /**
   * Compiles the authored value expression, reusing the cached program while the
   * expression text is unchanged.
   */
  CompileExpression()
  {
    return CjsControllerExpressionProgram.compileCached(this.#expression, this.value, 0);
  }

  /**
   * Evaluates the value expression against the controller context, returning 0
   * when it does not compile or does not produce a finite number.
   */
  GetValue(controller = this.#controller, owner = ITr2ControllerAction.getOwner(controller))
  {
    return this.#evaluateValue(controller, owner) ?? 0;
  }

  /**
   * Evaluates the value expression, returning null rather than 0 when it fails
   * to compile or yields a non-finite number so the caller can skip the write.
   */
  #evaluateValue(controller, owner)
  {
    const program = this.CompileExpression();
    if (!program.IsValid())
    {
      return null;
    }
    const runtime = controller;
    const value = Number(program.Evaluate(runtime?.GetExpressionContext?.(owner, null, {
      action: this
    }) ?? {
      controller: controller ?? undefined,
      owner,
      action: this
    }));
    return Number.isFinite(value) ? value : null;
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
  LinkDestination(controller = this.#controller, owner = ITr2ControllerAction.getOwner(controller))
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
