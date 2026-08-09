import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsControllerExpressionProgram } from '../expression/CjsControllerExpressionProgram.js';
import { ITr2ControllerAction } from './ITr2ControllerAction.js';

let _initProto, _initClass, _init_curveSet, _init_extra_curveSet, _init_value, _init_extra_value;

/**
 * Controller action that registers for per-frame updates and drives a curve
 * set's playhead from an expression, by default the elapsed state time.
 */
let _Tr2ActionAnimateCurv;
class Tr2ActionAnimateCurveSet extends CjsModel {
  static {
    ({
      e: [_init_curveSet, _init_extra_curveSet, _init_value, _init_extra_value, _initProto],
      c: [_Tr2ActionAnimateCurv, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2ActionAnimateCurveSet",
      family: "controllers"
    })], [[[io, io.persist, void 0, type.objectRef("TriCurveSet")], 16, "curveSet"], [[io, io.notify, io, io.persist, type, type.string], 16, "value"], [[carbon, carbon.method, impl, impl.adapted], 18, "Link"], [[carbon, carbon.method, impl, impl.implemented], 18, "Unlink"], [[carbon, carbon.method, impl, impl.adapted], 18, "Start"], [[carbon, carbon.method, impl, impl.implemented], 18, "Stop"], [[carbon, carbon.method, impl, impl.implemented], 18, "RebaseSimTime"], [[carbon, carbon.method, impl, impl.adapted], 18, "Update"], [[carbon, carbon.method, impl, impl.adapted], 18, "OnModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsExpressionValid"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetExpressionTermInfo"], [[carbon, carbon.method, impl, impl.adapted], 18, "EvaluateExpression"]], 0, void 0, CjsModel));
  }
  curveSet = (_initProto(this), _init_curveSet(this, null));
  value = (_init_extra_curveSet(this), _init_value(this, "StateTime()"));
  #runtime = (_init_extra_value(this), CjsControllerExpressionProgram.createRuntimeState());

  /**
   * Links this action to a controller.
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
   * Starts timeline updates for this action.
   */
  Start(controller = this.#runtime.controller) {
    if (!controller || !this.curveSet) {
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
   * Applies the evaluated time to the curve set.
   */
  Update(_realTime, simTime) {
    const controller = this.#runtime.controller;
    if (!controller || !this.curveSet) {
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
    this.curveSet.ApplyTime?.(value);
  }

  /**
   * Recompiles when the expression changes.
   */
  OnModified(_options = {}) {
    this.#runtime.program = null;
    return true;
  }

  /**
   * Checks whether the value expression compiles.
   */
  IsExpressionValid() {
    return this.CompileExpression().IsValid();
  }

  /**
   * Gets expression term metadata.
   */
  GetExpressionTermInfo() {
    const result = [];
    CjsControllerExpressionProgram.addControllerTermInfo(result);
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
    const program = CjsControllerExpressionProgram.compileCached(state, expression, 0);
    if (!program.IsValid()) {
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
  CompileExpression() {
    return CjsControllerExpressionProgram.compileCached(this.#runtime, this.value, 0);
  }
  static {
    _initClass();
  }
}

export { _Tr2ActionAnimateCurv as Tr2ActionAnimateCurveSet };
//# sourceMappingURL=Tr2ActionAnimateCurveSet.js.map
