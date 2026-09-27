// Source: trinity/trinity/Controllers/Actions/Tr2ActionSetValue.h
// Source: trinity/trinity/Controllers/Actions/Tr2ActionSetValue.cpp
import { CjsModel } from "#model";
import { carbon, impl, edit, type } from "#schema";
import { CjsControllerExpressionProgram } from "../expression/CjsControllerExpressionProgram.js";
import { ITr2ControllerAction } from "./ITr2ControllerAction.js";
import { CjsControllerExpressionEvaluateError } from "../expression/CjsControllerExpressionEvaluateError.js";
import { Tr2BindingPoint } from "../expression/Tr2BindingPoint.js";


/** @typedef {import("../expression/CjsControllerExpressionCompileError.js").CjsControllerExpressionCompileError} CjsControllerExpressionCompileError */

/**
 * Controller action that evaluates a value expression once on start and writes
 * the result into a bound destination property.
 */
@type.define({
  className: "Tr2ActionSetValue",
  family: "controllers"
})
@carbon.inherit(ITr2ControllerAction)
export class Tr2ActionSetValue extends CjsModel
{
  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.string
  value = "";

  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.string
  attribute = "";

  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.objectRef("IRoot")
  destination = null;

  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.boolean
  delayBinding = false;

  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.string
  path = "";

  _bindingPoint = null;

  _expression = {
    program: null,
    source: ""
  };
  _controller = null;

  /**
   * Links the destination when this action does not use delayed binding.
   *
   * Adapted: The existing JS binding adapter resolves the destination; an AST
   * program replaces native bytecode and is retained until a value notification,
   * relink or unlink.
   */
  @carbon.method
  @impl.adapted
  Link(controller)
  {
    this._controller = controller;
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
    this._bindingPoint?.Unlink();
    this._expression = {
      program: null,
      source: ""
    };
    this._controller = null;
  }

  /**
   * Evaluates the retained value expression and writes a successful result.
   *
   * Adapted: Uses the AST compiled for the linked controller; Start's controller
   * is used only for destination binding. Evaluation failures skip the write,
   * while successful NaN and infinity results are preserved as in native code.
   */
  @carbon.method
  @impl.adapted
  Start(controller = this._controller)
  {
    if (!controller)
    {
      return;
    }
    if (this.HasDelayedBinding())
    {
      this.LinkDestination(controller);
    }
    if (!this.IsBindingValid())
    {
      return;
    }
    const value = this._evaluateValue();
    if (value === null)
    {
      return;
    }
    this._bindingPoint.SetValue(value);
  }

  /**
   * Relinks or recompiles when authored fields change.
   *
   * Adapted: Selects native member notifications by exposed property name.
   */
  @carbon.method
  @impl.adapted
  OnModified(propertyName)
  {
    if (!this._controller) return true;
    if (propertyName === "path" || propertyName === "attribute" || propertyName === "destination" || propertyName === "delayBinding")
    {
      if (!this.HasDelayedBinding()) this.LinkDestination(this._controller);
    }
    else if (propertyName === "value")
    {
      this._expression.program = null;
      this.CompileExpression();
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
    return !!this._bindingPoint?.IsValid();
  }

  /**
   * Reports retained compilation validity without compiling or rebinding.
   */
  @carbon.method
  @impl.implemented
  IsExpressionValid()
  {
    return !!this._expression.program?.IsValid();
  }

  /**
   * Carbon's Blue arity adapter (the same property/method name-collision
   * forward all four action classes carry): takes and discards the
   * attribute name. Same forward here for nominal parity.
   */
  @carbon.method
  @impl.implemented
  IsAttrExpressionValid(_attributeName)
  {
    return this.IsExpressionValid();
  }

  /**
   * Gets the bound destination object.
   */
  @carbon.method
  @impl.implemented
  GetDestination(controller = this._controller, owner = ITr2ControllerAction.getOwner(controller))
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
    this._controller?.GetExpressionTermInfo?.(result);
    return result;
  }

  /**
   * Evaluates an expression against this action's linked controller.
   *
   * Adapted: Returns a number and throws typed JS errors instead of BlueStdResult
   * and an output argument. The shared AST parser still differs from native
   * variable binding, arithmetic and float32 evaluation; this is a lifecycle port.
   *
   * @param {string} expression Source text.
   * @returns {number} Successful result, including nonfinite values.
   * @throws {CjsControllerExpressionCompileError} If parsing fails.
   * @throws {CjsControllerExpressionEvaluateError} If unlinked or evaluation fails.
   */
  @carbon.method
  @impl.adapted
  EvaluateExpression(expression)
  {
    if (!this._controller)
    {
      throw new CjsControllerExpressionEvaluateError({ expression, reason: "controller needs to be running when evaluating expressions" });
    }
    const program = CjsControllerExpressionProgram.Compile(expression, { allowEmpty: false });
    if (!program.IsValid())
    {
      // Preserve the parser's typed error and source position.
      program.Evaluate();
    }
    try
    {
      return Number(program.Evaluate(this._getExpressionContext()));
    }
    catch (cause)
    {
      const error = new CjsControllerExpressionEvaluateError({ expression, reason: cause?.message ?? String(cause) });
      error.cause = cause;
      throw error;
    }
  }

  /**
   * Compiles and retains the authored expression for the linked controller.
   * Custom: Extracts native SetExpr calls used by Link and value notification;
   * blank source is invalid. Other expression consumers keep their own policy.
   */
  @impl.custom
  CompileExpression()
  {
    this._expression = {
      source: this.value,
      program: this._controller ? CjsControllerExpressionProgram.Compile(this.value, { allowEmpty: false }) : null
    };
    return this._expression.program;
  }

  /**
   * Evaluates the retained program, returning zero on unavailable evaluation.
   * Custom: Retains the existing numeric convenience accessor on this action.
   */
  @impl.custom
  GetValue()
  {
    return this._evaluateValue() ?? 0;
  }

  /** Evaluates retained state, returning null on failure so Start skips its write. */
  _evaluateValue()
  {
    const program = this._expression.program;
    if (!this._controller || !program?.IsValid())
    {
      return null;
    }
    try
    {
      return Number(program.Evaluate(this._getExpressionContext()));
    }
    catch
    {
      return null;
    }
  }

  /** Builds the existing JS expression context using the compilation controller. */
  _getExpressionContext()
  {
    const controller = this._controller;
    const owner = ITr2ControllerAction.getOwner(controller);
    return controller.GetExpressionContext ? controller.GetExpressionContext(owner, null, { action: this }) : { controller, owner, action: this };
  }

  /**
   * Gets the lazily created binding point, refreshing it from the currently
   * authored path, destination object and attribute on every call.
   */
  GetBindingPoint()
  {
    if (!this._bindingPoint)
    {
      this._bindingPoint = new Tr2BindingPoint();
    }
    this._bindingPoint.path = this.path;
    this._bindingPoint.object = this.destination;
    this._bindingPoint.attribute = this.attribute;
    return this._bindingPoint;
  }

  /**
   * Resolves the binding point against the controller's binding roots and its
   * owner.
   */
  LinkDestination(controller = this._controller, owner = ITr2ControllerAction.getOwner(controller))
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
