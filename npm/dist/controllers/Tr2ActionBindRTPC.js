import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsControllerExpressionProgram } from './CjsControllerExpressionProgram.js';
import { ITr2ControllerAction } from './ITr2ControllerAction.js';

let _initProto, _initClass, _init_value, _init_extra_value, _init_emitter, _init_extra_emitter, _init_rtpcName, _init_extra_rtpcName, _init_curve, _init_extra_curve;

/**
 * Controller action that registers for per-frame updates and pushes an
 * expression-driven value into a named Wwise real-time parameter on a sound
 * emitter.
 */
let _Tr2ActionBindRTPC;
class Tr2ActionBindRTPC extends CjsModel {
  static {
    ({
      e: [_init_value, _init_extra_value, _init_emitter, _init_extra_emitter, _init_rtpcName, _init_extra_rtpcName, _init_curve, _init_extra_curve, _initProto],
      c: [_Tr2ActionBindRTPC, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2ActionBindRTPC",
      family: "controllers"
    })], [[[io, io.notify, io, io.persist, type, type.string], 16, "value"], [[io, io.persist, type, type.string], 16, "emitter"], [[io, io.persist, type, type.string], 16, "rtpcName"], [[io, io.persist, void 0, type.objectRef("ITriScalarFunction")], 16, "curve"], [[carbon, carbon.method, impl, impl.adapted], 18, "Link"], [[carbon, carbon.method, impl, impl.implemented], 18, "Unlink"], [[carbon, carbon.method, impl, impl.adapted], 18, "Start"], [[carbon, carbon.method, impl, impl.implemented], 18, "StartWithController"], [[carbon, carbon.method, impl, impl.implemented], 18, "Stop"], [[carbon, carbon.method, impl, impl.implemented], 18, "StopWithController"], [[carbon, carbon.method, impl, impl.adapted], 18, "Update"], [[carbon, carbon.method, impl, impl.adapted], 18, "OnModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsExpressionValid"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetCurveValue"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetExpressionTermInfo"], [[carbon, carbon.method, impl, impl.adapted], 18, "EvaluateExpression"]], 0, void 0, CjsModel));
  }
  value = (_initProto(this), _init_value(this, ""));
  emitter = (_init_extra_value(this), _init_emitter(this, ""));
  rtpcName = (_init_extra_emitter(this), _init_rtpcName(this, ""));
  curve = (_init_extra_rtpcName(this), _init_curve(this, null));
  #runtime = (_init_extra_curve(this), CjsControllerExpressionProgram.createRuntimeState());
  #emitter = null;

  /**
   * Links and compiles the RTPC value expression.
   */
  Link(controller) {
    this.#runtime.controller = controller;
    this.CompileExpression();
  }

  /**
   * Clears runtime expression state.
   */
  Unlink() {
    this.#runtime = CjsControllerExpressionProgram.createRuntimeState();
  }

  /**
   * Starts RTPC updates.
   */
  Start(controller = this.#runtime.controller) {
    if (!controller) {
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
  StartWithController(controller) {
    this.Start(ITr2ControllerAction.requireController(controller, "StartWithController"));
  }

  /**
   * Stops RTPC updates.
   */
  Stop(controller = this.#runtime.controller) {
    controller?.UnRegisterUpdateable?.(this);
  }

  /**
   * Stops manually with an explicit controller.
   */
  StopWithController(controller) {
    this.Stop(ITr2ControllerAction.requireController(controller, "StopWithController"));
  }

  /**
   * Updates the target RTPC value.
   */
  Update(_realTime, simTime) {
    const controller = this.#runtime.controller;
    if (!controller) {
      return;
    }
    this.#runtime.lastTime = simTime;
    const program = this.CompileExpression();
    if (!program.IsValid()) {
      return;
    }
    const value = Number(program.Evaluate(CjsControllerExpressionProgram.makeActionContext(controller, ITr2ControllerAction.getOwner(controller), this.#runtime, {
      action: this
    }))) || 0;
    if (ITr2ControllerAction.hasFunction(this.#emitter, "SetRTPC")) {
      this.#emitter.SetRTPC(this.rtpcName, value);
    }
  }

  /**
   * Recompiles when authored fields change.
   */
  OnModified(_options = {}) {
    this.#runtime.program = null;
    return true;
  }

  /**
   * Checks whether the expression compiles.
   */
  IsExpressionValid() {
    return this.CompileExpression().IsValid();
  }

  /**
   * Gets a curve value for expression helpers.
   */
  GetCurveValue(time) {
    return CjsControllerExpressionProgram.getCurveValue(this.curve, time);
  }

  /**
   * Gets expression term metadata from the linked controller.
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
   * Evaluates an expression against this action's controller context.
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
  static {
    _initClass();
  }
}

export { _Tr2ActionBindRTPC as Tr2ActionBindRTPC };
//# sourceMappingURL=Tr2ActionBindRTPC.js.map
