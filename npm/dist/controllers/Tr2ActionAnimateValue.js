import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsControllerExpressionProgram } from './CjsControllerExpressionProgram.js';
import { ITr2ControllerAction } from './ITr2ControllerAction.js';
import { Tr2BindingPoint as _Tr2BindingPoint } from './Tr2BindingPoint.js';

let _initProto, _initClass, _init_curve, _init_extra_curve, _init_attribute, _init_extra_attribute, _init_destination, _init_extra_destination, _init_delayBinding, _init_extra_delayBinding, _init_path, _init_extra_path, _init_value, _init_extra_value;

/**
 * Controller action that registers for per-frame updates and continuously writes
 * an expression-driven value, by default the action's curve sampled at state
 * time, into a bound destination property.
 */
let _Tr2ActionAnimateValu;
class Tr2ActionAnimateValue extends CjsModel {
  static {
    ({
      e: [_init_curve, _init_extra_curve, _init_attribute, _init_extra_attribute, _init_destination, _init_extra_destination, _init_delayBinding, _init_extra_delayBinding, _init_path, _init_extra_path, _init_value, _init_extra_value, _initProto],
      c: [_Tr2ActionAnimateValu, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2ActionAnimateValue",
      family: "controllers"
    })], [[[io, io.persist, void 0, type.objectRef("ITriScalarFunction")], 16, "curve"], [[io, io.notify, io, io.persist, type, type.string], 16, "attribute"], [[io, io.notify, io, io.persist, void 0, type.objectRef("IRoot")], 16, "destination"], [[io, io.notify, io, io.persist, type, type.boolean], 16, "delayBinding"], [[io, io.notify, io, io.persist, type, type.string], 16, "path"], [[io, io.notify, io, io.persist, type, type.string], 16, "value"], [[carbon, carbon.method, impl, impl.adapted], 18, "Link"], [[carbon, carbon.method, impl, impl.implemented], 18, "Unlink"], [[carbon, carbon.method, impl, impl.adapted], 18, "Start"], [[carbon, carbon.method, impl, impl.implemented], 18, "Stop"], [[carbon, carbon.method, impl, impl.implemented], 18, "RebaseSimTime"], [[carbon, carbon.method, impl, impl.adapted], 18, "Update"], [[carbon, carbon.method, impl, impl.adapted], 18, "OnModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsBindingValid"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsExpressionValid"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetCurveValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetDestination"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetExpressionTermInfo"], [[carbon, carbon.method, impl, impl.adapted], 18, "EvaluateExpression"]], 0, void 0, CjsModel));
  }
  curve = (_initProto(this), _init_curve(this, null));
  attribute = (_init_extra_curve(this), _init_attribute(this, ""));
  destination = (_init_extra_attribute(this), _init_destination(this, null));
  delayBinding = (_init_extra_destination(this), _init_delayBinding(this, false));
  path = (_init_extra_delayBinding(this), _init_path(this, ""));
  value = (_init_extra_path(this), _init_value(this, "Curve(StateTime())"));
  #bindingPoint = (_init_extra_value(this), null);
  #runtime = CjsControllerExpressionProgram.createRuntimeState();

  /**
   * Links the destination and compiles the value expression.
   */
  Link(controller) {
    this.#runtime.controller = controller;
    if (!this.HasDelayedBinding()) {
      this.LinkDestination(controller);
    }
    this.CompileExpression();
  }

  /**
   * Unlinks the destination and update registration.
   */
  Unlink() {
    this.#bindingPoint?.Unlink();
    this.#runtime = CjsControllerExpressionProgram.createRuntimeState();
  }

  /**
   * Starts updating the destination value.
   */
  Start(controller = this.#runtime.controller) {
    if (!controller) {
      return;
    }
    const owner = ITr2ControllerAction.getOwner(controller);
    this.#runtime.controller = controller;
    if (this.HasDelayedBinding() || !this.IsBindingValid()) {
      this.LinkDestination(controller, owner);
    }
    if (!this.IsBindingValid()) {
      return;
    }
    this.#runtime.startTime = ITr2ControllerAction.getTime(controller);
    this.#runtime.lastTime = this.#runtime.startTime;
    controller.RegisterUpdateable?.(this);
  }

  /**
   * Stops updating the destination value.
   */
  Stop(controller = this.#runtime.controller) {
    controller?.UnRegisterUpdateable?.(this);
  }

  /**
   * Rebases stored simulation time.
   */
  RebaseSimTime(diff) {
    this.#runtime.startTime += diff;
    this.#runtime.lastTime += diff;
  }

  /**
   * Evaluates and writes the animated value.
   */
  Update(_realTime, simTime) {
    const controller = this.#runtime.controller;
    if (!controller) {
      return;
    }
    this.#runtime.lastTime = simTime;
    const program = this.CompileExpression();
    if (!program.IsValid() || !this.IsBindingValid()) {
      return;
    }
    this.GetBindingPoint().SetValue(program.Evaluate(CjsControllerExpressionProgram.makeActionContext(controller, ITr2ControllerAction.getOwner(controller), this.#runtime, {
      action: this
    })), controller, ITr2ControllerAction.getOwner(controller));
  }

  /**
   * Handles authored field changes.
   */
  OnModified(_options = {}) {
    this.#runtime.program = null;
    if (this.#runtime.controller && !this.HasDelayedBinding()) {
      this.LinkDestination(this.#runtime.controller);
    }
    return true;
  }

  /**
   * Checks whether the binding currently resolves.
   */
  IsBindingValid() {
    return !!this.#bindingPoint?.IsValid();
  }

  /**
   * Checks whether the value expression compiles.
   */
  IsExpressionValid() {
    return this.CompileExpression().IsValid();
  }

  /**
   * Gets a curve value for the expression helper.
   */
  GetCurveValue(time) {
    return CjsControllerExpressionProgram.getCurveValue(this.curve, time);
  }

  /**
   * Gets the bound destination object.
   */
  GetDestination(controller = this.#runtime.controller, owner = ITr2ControllerAction.getOwner(controller)) {
    return this.GetBindingPoint().GetBoundObject(controller, owner);
  }

  /**
   * Gets expression term metadata.
   */
  GetExpressionTermInfo() {
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
  EvaluateExpression(expression) {
    const state = {
      program: null,
      source: ""
    };
    const program = CjsControllerExpressionProgram.compileCached(state, expression, 0, {
      Curve: (_ctx, time) => this.GetCurveValue(Number(time))
    });
    if (!program.IsValid()) {
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
  CompileExpression() {
    return CjsControllerExpressionProgram.compileCached(this.#runtime, this.value, 0, {
      Curve: (_ctx, time) => this.GetCurveValue(Number(time))
    });
  }

  /**
   * Gets the lazily created binding point, refreshing it from the currently
   * authored path, destination object and attribute on every call.
   */
  GetBindingPoint() {
    if (!this.#bindingPoint) {
      this.#bindingPoint = new _Tr2BindingPoint();
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
  LinkDestination(controller = this.#runtime.controller, owner = ITr2ControllerAction.getOwner(controller)) {
    return this.GetBindingPoint().Link(controller, owner);
  }

  /**
   * Checks whether binding is deferred to Start, which requires both the
   * delayBinding flag and an authored path.
   */
  HasDelayedBinding() {
    return this.delayBinding && !!this.path;
  }
  static {
    _initClass();
  }
}

export { _Tr2ActionAnimateValu as Tr2ActionAnimateValue };
//# sourceMappingURL=Tr2ActionAnimateValue.js.map
