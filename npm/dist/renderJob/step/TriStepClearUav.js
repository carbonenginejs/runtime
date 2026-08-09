import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { TriRenderStep as _TriRenderStep } from './TriRenderStep.js';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initProto, _initClass, _init_buffer, _init_extra_buffer, _init_clearWithFloat, _init_extra_clearWithFloat, _init_floatValue, _init_extra_floatValue, _init_bitValue, _init_extra_bitValue, _init_bitValue2, _init_extra_bitValue2, _init_bitValue3, _init_extra_bitValue3, _init_bitValue4, _init_extra_bitValue4;

/** A render step that clears an unordered-access buffer to a fixed value. */
let _TriStepClearUav;
class TriStepClearUav extends _TriRenderStep {
  static {
    ({
      e: [_init_buffer, _init_extra_buffer, _init_clearWithFloat, _init_extra_clearWithFloat, _init_floatValue, _init_extra_floatValue, _init_bitValue, _init_extra_bitValue, _init_bitValue2, _init_extra_bitValue2, _init_bitValue3, _init_extra_bitValue3, _init_bitValue4, _init_extra_bitValue4, _initProto],
      c: [_TriStepClearUav, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriStepClearUav",
      family: "renderJob"
    })], [[[io, io.persist, void 0, type.model("ITr2GpuBuffer")], 16, "buffer"], [[io, io.persist, type, type.boolean], 16, "clearWithFloat"], [[io, io.persist, type, type.vec4], 16, "floatValue"], [[io, io.persist, type, type.uint32], 16, "bitValue0"], [[io, io.persist, type, type.uint32], 16, "bitValue1"], [[io, io.persist, type, type.uint32], 16, "bitValue2"], [[io, io.persist, type, type.uint32], 16, "bitValue3"], [[carbon, carbon.method, impl, impl.adapted], 18, "__init__"], [[carbon, carbon.method, impl, impl.adapted], 18, "Execute"]], 0, void 0, _TriRenderStep));
  }
  constructor(...args) {
    super(...args);
    _init_extra_bitValue4(this);
  }
  /** m_buffer (ITr2GpuBufferPtr) [READWRITE, PERSIST] */
  buffer = (_initProto(this), _init_buffer(this, null));

  /** m_clearWithFloat (bool) [READWRITE, PERSIST] */
  clearWithFloat = (_init_extra_buffer(this), _init_clearWithFloat(this, false));

  /** m_floatValue (Vector4) [READWRITE, PERSIST] */
  floatValue = (_init_extra_clearWithFloat(this), _init_floatValue(this, vec4.create()));

  /** m_uintValue[0] (uint32_t) [READWRITE, PERSIST] */
  bitValue0 = (_init_extra_floatValue(this), _init_bitValue(this, 0));

  /** m_uintValue[1] (uint32_t) [READWRITE, PERSIST] */
  bitValue1 = (_init_extra_bitValue(this), _init_bitValue2(this, 0));

  /** m_uintValue[2] (uint32_t) [READWRITE, PERSIST] */
  bitValue2 = (_init_extra_bitValue2(this), _init_bitValue3(this, 0));

  /** m_uintValue[3] (uint32_t) [READWRITE, PERSIST] */
  bitValue3 = (_init_extra_bitValue3(this), _init_bitValue4(this, 0));

  /** Carbon method __init__ -> py__init__ (MAP_METHOD). */
  __init__(buffer = null, values = null) {
    this.buffer = buffer;
    if (values == null) return;
    if (!Array.isArray(values) && !ArrayBuffer.isView(values)) throw new TypeError("clear values must be a four-component array");
    if (values.length !== 4) throw new RangeError("clear values must contain four components");
    this.clearWithFloat = values instanceof Float32Array || values.some(value => !Number.isInteger(value));
    if (this.clearWithFloat) {
      vec4.set(this.floatValue, Number(values[0]), Number(values[1]), Number(values[2]), Number(values[3]));
    } else {
      this.bitValue0 = Number(values[0]) >>> 0;
      this.bitValue1 = Number(values[1]) >>> 0;
      this.bitValue2 = Number(values[2]) >>> 0;
      this.bitValue3 = Number(values[3]) >>> 0;
    }
  }

  /**
   * Clears the bound unordered-access buffer to its configured value.
   */
  Execute(_realTime, _simTime, executor) {
    if (this.buffer) {
      const value = this.clearWithFloat ? this.floatValue : [this.bitValue0, this.bitValue1, this.bitValue2, this.bitValue3];
      executor?.ClearUav?.(this.buffer, value, this.clearWithFloat);
    }
    return _TriRenderStep.Result.RS_OK;
  }
  static {
    _initClass();
  }
}

export { _TriStepClearUav as TriStepClearUav };
//# sourceMappingURL=TriStepClearUav.js.map
