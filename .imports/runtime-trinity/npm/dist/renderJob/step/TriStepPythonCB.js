import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { carbon, impl, type } from '@carbonenginejs/runtime-utils/schema';
import { TriRenderStep as _TriRenderStep } from './TriRenderStep.js';

let _initProto, _initClass, _init_callback, _init_extra_callback;

/** A render step that invokes a host-supplied callback at its point in the job order. */
let _TriStepPythonCB;
class TriStepPythonCB extends _TriRenderStep {
  static {
    ({
      e: [_init_callback, _init_extra_callback, _initProto],
      c: [_TriStepPythonCB, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriStepPythonCB",
      family: "renderJob"
    })], [[type.rawStruct("BlueScriptCallback"), 0, "callback"], [[carbon, carbon.method, impl, impl.adapted], 18, "__init__"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetCallback"], [[carbon, carbon.method, impl, impl.adapted], 18, "Execute"]], 0, void 0, _TriRenderStep));
  }
  constructor(...args) {
    super(...args);
    _init_extra_callback(this);
  }
  /** m_callback (BlueScriptCallback) */
  callback = (_initProto(this), _init_callback(this, null));

  /** Carbon method __init__ -> SetCallback (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  __init__(callback = null) {
    this.SetCallback(callback);
  }

  /** Carbon method SetCallback (MAP_METHOD_AND_WRAP). */
  SetCallback(callback) {
    if (callback != null && typeof callback !== "function" && typeof callback.CallVoid !== "function") {
      throw new TypeError("callback must be a function, callback object, or null");
    }
    this.callback = callback;
  }

  /**
   * Invokes the host callback and reports the step complete.
   */
  Execute(_realTime, _simTime, executor) {
    try {
      if (typeof this.callback === "function") this.callback();else this.callback?.CallVoid?.();
    } catch (error) {
      executor?.ReportDiagnostic?.({
        type: "callback-error",
        step: this,
        error
      });
    }
    return _TriRenderStep.Result.RS_OK;
  }
  static {
    _initClass();
  }
}

export { _TriStepPythonCB as TriStepPythonCB };
//# sourceMappingURL=TriStepPythonCB.js.map
