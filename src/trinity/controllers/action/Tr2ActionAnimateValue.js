// Source: trinity/trinity/Controllers/Actions/Tr2ActionAnimateValue.h
// Source: trinity/trinity/Controllers/Actions/Tr2ActionAnimateValue.cpp
// Source: trinity/trinity/Controllers/Actions/Tr2ActionAnimateValue_Blue.cpp
import { meta } from "#schema";
import { blue } from "#blue";
import { INotify } from "#blue/INotify";
import { CjsControllerExpressionProgram } from "../expression/CjsControllerExpressionProgram.js";
import { ITr2ControllerAction } from "./ITr2ControllerAction.js";
import { ITr2Updateable } from "../../core/ITr2Updateable.js";
import { Tr2BindingPoint } from "../expression/Tr2BindingPoint.js";


/**
 * Controller action that registers for per-frame updates and continuously writes
 * an expression-driven value, by default the action's curve sampled at state
 * time, into a bound destination property.
 */
@meta.define({
  className: "Tr2ActionAnimateValue",
  family: "controllers"
})
@meta.blue.inherit(ITr2Updateable, INotify)
export class Tr2ActionAnimateValue extends ITr2ControllerAction
{
  /** Flattened adapter storage for m_destination.m_path. */
  @meta.member("path")
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  path = "";

  /** Flattened adapter storage for m_destination.m_object. */
  @meta.member("destination")
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("IRoot")
  destination = null;

  /** Flattened adapter storage for m_destination.m_attribute. */
  @meta.member("attribute")
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  attribute = "";

  /** m_value: expression compiled when linked or notified. */
  @meta.member("value")
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  value = "Curve(StateTime())";

  /** m_curve: native scalar curve, without member notification. */
  @meta.member("curve")
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("ITriScalarFunction")
  curve = null;

  /** m_delayBinding: defers a nonempty path binding to Start. */
  @meta.member("delayBinding")
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  delayBinding = false;

  /** Live native READ property reporting the current binding. */
  @meta.property()
  @meta.blue.read
  @meta.type.boolean
  @meta.implemented
  get isBindingValid()
  {
    return this.IsBindingValid();
  }

  /** Live native READ property observing retained compilation without compiling. */
  @meta.property()
  @meta.blue.read
  @meta.type.boolean
  @meta.implemented
  get isExpressionValid()
  {
    return !!this._runtime.program?.IsValid();
  }

  _bindingPoint = null;

  _runtime = CjsControllerExpressionProgram.createRuntimeState();

  /**
   * Links the destination and compiles the value expression.
   * Adapted: retains the shared AST compiler and flattened binding adapter
   * instead of native bytecode and embedded binding-point storage.
   */
  @meta.blue.method
  @meta.adapted
  Link(controller)
  {
    this._runtime.controller = controller;
    if (!this.HasDelayedBinding())
    {
      this.LinkDestination(controller);
    }
    this.CompileExpression();
  }

  /**
   * Clears the binding and evaluation state; Stop owns update unregistration.
   * Adapted: resets the shared AST runtime record, including its times; native
   * clears the evaluator/controller while retaining the two time fields.
   */
  @meta.blue.method
  @meta.adapted
  Unlink()
  {
    this._bindingPoint?.Unlink();
    this._runtime = CjsControllerExpressionProgram.createRuntimeState();
  }

  /**
   * Starts updating the destination value.
   * Adapted: retains optional linked-controller invocation, rebinding invalid
   * destinations, replacing the evaluation controller and setting lastTime.
   * Native Start only rebinds delayed destinations and sets startTime before
   * registering; those existing non-update adapter differences remain deferred.
   */
  @meta.blue.method
  @meta.adapted
  Start(controller = this._runtime.controller)
  {
    if (!controller)
    {
      return;
    }
    const owner = ITr2ControllerAction.getOwner(controller);
    this._runtime.controller = controller;
    if (this.HasDelayedBinding() || !this.IsBindingValid())
    {
      this.LinkDestination(controller, owner);
    }
    if (!this.IsBindingValid())
    {
      return;
    }
    this._runtime.startTime = blue.os.GetCurrentFrameTime();
    this._runtime.lastTime = this._runtime.startTime;
    controller.RegisterUpdateable(this);
  }

  /**
   * Stops updating the destination value.
   * Adapted: retains optional linked-controller invocation and unlinked no-op;
   * native requires a controller reference and directly unregisters the action.
   */
  @meta.blue.method
  @meta.adapted
  Stop(controller = this._runtime.controller)
  {
    controller?.UnRegisterUpdateable(this);
  }

  /**
   * Rebases stored simulation time.
   */
  @meta.blue.method
  @meta.implemented
  RebaseSimTime(diff)
  {
    this._runtime.startTime += diff;
    this._runtime.lastTime += diff;
  }

  /**
   * Evaluates and writes the animated value.
   * Adapted: evaluates retained AST state instead of native bytecode. Failed
   * evaluation skips the write; binding write errors remain observable. Updates
   * never recompile unnotified source edits (native cpp:90-104).
   */
  @meta.blue.method
  @meta.adapted
  Update(_realTime, simTime)
  {
    this._runtime.lastTime = simTime;
    const controller = this._runtime.controller;
    if (!controller)
    {
      return;
    }
    const program = this._runtime.program;
    if (!this.IsBindingValid() || !program || !program.IsValid())
    {
      return;
    }
    const owner = ITr2ControllerAction.getOwner(controller);
    const context = CjsControllerExpressionProgram.makeActionContext(controller, owner, this._runtime, { action: this });
    let value;
    try
    {
      value = program.Evaluate(context);
    }
    catch
    {
      return;
    }
    this.GetBindingPoint().SetValue(value, controller, owner);
  }

  /**
   * Handles authored field changes.
   * Adapted: selects native member notifications by exposed name; expression
   * compilation and destination binding retain their existing JS adapters.
   */
  @meta.blue.method
  @meta.adapted
  OnModified(propertyName)
  {
    if (!this._runtime.controller) return true;
    if (propertyName === "path" || propertyName === "attribute" || propertyName === "destination" || propertyName === "delayBinding")
    {
      if (!this.HasDelayedBinding()) this.LinkDestination(this._runtime.controller);
    }
    else if (propertyName === "value")
    {
      this._runtime.program = null;
      this.CompileExpression();
    }
    return true;
  }

  /**
   * Checks whether the binding currently resolves.
   */
  @meta.blue.method
  @meta.implemented
  IsBindingValid()
  {
    return !!this._bindingPoint?.IsValid();
  }

  /**
   * Checks whether the value expression compiles.
   * Adapted: retains compile-on-query behavior; native observes its retained
   * evaluator without compiling. Queries can therefore adopt unnotified edits.
   */
  @meta.blue.method
  @meta.adapted
  IsExpressionValid()
  {
    return this.CompileExpression().IsValid();
  }

  /**
   * Carbon's Blue arity adapter (Tr2ActionAnimateValue.cpp:150-153): the
   * scripting layer exposes the PROPERTY isExpressionValid AND the METHOD
   * IsExpressionValid(attrName), which cannot share one C++ function, so
   * this forward takes and discards the attribute name. Same forward here
   * for nominal parity.
   */
  @meta.blue.method
  @meta.implemented
  IsAttrExpressionValid(_attributeName)
  {
    return this.IsExpressionValid();
  }

  /**
   * Gets a curve value for the expression helper.
   * Adapted: retains shared JS curve-shape coercion and fallback behavior;
   * native calls ITriScalarFunction.GetValueAt directly, returning zero if null.
   */
  @meta.blue.method
  @meta.adapted
  GetCurveValue(time)
  {
    return CjsControllerExpressionProgram.getCurveValue(this.curve, time);
  }

  /**
   * Gets the bound destination object.
   * Adapted: retains optional controller/owner arguments and the binding adapter's
   * lazy resolution; native simply reads the embedded binding's current object.
   */
  @meta.blue.method
  @meta.adapted
  GetDestination(controller = this._runtime.controller, owner = ITr2ControllerAction.getOwner(controller))
  {
    return this.GetBindingPoint().GetBoundObject(controller, owner);
  }

  /**
   * Gets expression term metadata.
   * Adapted: shared AST term records replace native evaluator metadata; a
   * linked controller supplies its required GetExpressionTermInfo operation.
   */
  @meta.blue.method
  @meta.adapted
  GetExpressionTermInfo()
  {
    const result = [];
    CjsControllerExpressionProgram.addControllerTermInfo(result, {
      curve: true
    });
    this._runtime.controller?.GetExpressionTermInfo(result);
    return result;
  }

  /**
   * Evaluates an arbitrary expression.
   * Adapted: retains numeric zero for invalid/NaN results and optional unlinked
   * context instead of native BlueStdResult failures. Native typed error and
   * float32 evaluation parity remain outside this class-removal batch.
   */
  @meta.blue.method
  @meta.adapted
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
    const controller = this._runtime.controller;
    return Number(program.Evaluate(CjsControllerExpressionProgram.makeActionContext(controller, ITr2ControllerAction.getOwner(controller), this._runtime, {
      action: this
    }))) || 0;
  }

  /**
   * Compiles the authored value expression with the `Curve` function bound to
   * this action's curve, reusing the cached program while the text is unchanged.
   * Custom: retained AST cache replaces native evaluator SetExpr; Link,
   * notifications and the existing validity-query adapter call it.
   */
  @meta.ours
  CompileExpression()
  {
    return CjsControllerExpressionProgram.compileCached(this._runtime, this.value, 0, {
      Curve: (_ctx, time) => this.GetCurveValue(Number(time))
    });
  }

  /**
   * Gets the lazily created binding point, refreshing it from the currently
   * authored path, destination object and attribute on every call.
   * Custom: preserves flattened JS storage instead of the native embedded point.
   */
  @meta.ours
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
   * Adapted: the binding adapter accepts controller/owner inputs instead of
   * native controller.GetBindingPathRoots().
   */
  @meta.blue.method
  @meta.adapted
  LinkDestination(controller = this._runtime.controller, owner = ITr2ControllerAction.getOwner(controller))
  {
    return this.GetBindingPoint().Link(controller, owner);
  }

  /**
   * Checks whether binding is deferred to Start, which requires both the
   * delayBinding flag and an authored path.
   */
  @meta.blue.method
  @meta.implemented
  HasDelayedBinding()
  {
    return this.delayBinding && !!this.path;
  }
}

// Native exposure ends at this concrete table (Tr2ActionAnimateValue_Blue.cpp:13-16,51).
meta.blue.interfaceTable({
  interfaces: [Tr2ActionAnimateValue, ITr2ControllerAction, ITr2Updateable, INotify],
  chainTo: null
})(Tr2ActionAnimateValue);
