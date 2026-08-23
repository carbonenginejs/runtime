import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { TriRenderStep as _TriRenderStep } from './TriRenderStep.js';
import { Tr2VariableStore as _Tr2VariableStore } from '../../core/variable/Tr2VariableStore.js';

let _initProto, _initClass, _init_variableName, _init_extra_variableName, _init_value, _init_extra_value;

/** A render step that writes one named value into the variable store shaders read. */
let _TriStepSetVariableSt;
class TriStepSetVariableStore extends _TriRenderStep {
  static {
    ({
      e: [_init_variableName, _init_extra_variableName, _init_value, _init_extra_value, _initProto],
      c: [_TriStepSetVariableSt, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriStepSetVariableStore",
      family: "renderJob"
    })], [[[io, io.persist, type, type.string], 16, "variableName"], [[io, io.readwrite, void 0, type.rawStruct("TriVariableValue")], 16, "value"], [[carbon, carbon.method, impl, impl.adapted], 18, "__init__"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetName"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetValue"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetValue"], [[carbon, carbon.method, impl, impl.adapted], 18, "Execute"]], 0, void 0, _TriRenderStep));
  }
  constructor(...args) {
    super(...args);
    _init_extra_value(this);
  }
  /** m_variableName (std::string) [READWRITE, PERSIST] */
  variableName = (_initProto(this), _init_variableName(this, ""));
  value = (_init_extra_variableName(this), _init_value(this, null));

  /** Carbon method __init__ -> py__init__ (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  __init__(name = undefined, value = undefined) {
    if (name !== undefined) this.SetName(name);
    if (value !== undefined && value !== null) this.SetValue(value);
  }

  /**
   * Sets the name of the variable this step writes.
   */
  SetName(name) {
    this.variableName = String(name ?? "");
  }

  /**
   * The value this step writes into the variable store.
   */
  GetValue() {
    if (ArrayBuffer.isView(this.value)) return this.value.slice();
    if (Array.isArray(this.value)) return this.value.slice();
    return this.value;
  }

  /**
   * Sets the value this step writes, copying array and typed-array values so a
   * later mutation by the caller cannot change what the step publishes.
   */
  SetValue(value) {
    this.value = ArrayBuffer.isView(value) || Array.isArray(value) ? value.slice() : value;
  }

  /**
   * Registers the named value on the global variable store, so shaders reading
   * that variable see it from this point in the job order onward.
   */
  Execute(_realTime, _simTime, _executor) {
    if (this.variableName && this.value !== null) _Tr2VariableStore.GlobalStore().RegisterVariable(this.variableName, this.value);
    return _TriRenderStep.Result.RS_OK;
  }
  static {
    _initClass();
  }
}

export { _TriStepSetVariableSt as TriStepSetVariableStore };
//# sourceMappingURL=TriStepSetVariableStore.js.map
