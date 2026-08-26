// Source: trinity/trinity/RenderJob/TriStepClearUav.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";
import { vec4 } from "#math/vec4";

/** A render step that clears an unordered-access buffer to a fixed value. */
@type.define({ className: "TriStepClearUav", family: "renderJob" })
export class TriStepClearUav extends TriRenderStep
{

  /** m_buffer (ITr2GpuBufferPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("ITr2GpuBuffer")
  buffer = null;

  /** m_clearWithFloat (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  clearWithFloat = false;

  /** m_floatValue (Vector4) [READWRITE, PERSIST] */
  @io.persist
  @type.vec4
  floatValue = vec4.create();

  /** m_uintValue[0] (uint32_t) [READWRITE, PERSIST] */
  @io.persist
  @type.uint32
  bitValue0 = 0;

  /** m_uintValue[1] (uint32_t) [READWRITE, PERSIST] */
  @io.persist
  @type.uint32
  bitValue1 = 0;

  /** m_uintValue[2] (uint32_t) [READWRITE, PERSIST] */
  @io.persist
  @type.uint32
  bitValue2 = 0;

  /** m_uintValue[3] (uint32_t) [READWRITE, PERSIST] */
  @io.persist
  @type.uint32
  bitValue3 = 0;

  /** Carbon method __init__ -> py__init__ (MAP_METHOD). */
  @carbon.method
  @impl.adapted
  __init__(buffer = null, values = null)
  {
    this.buffer = buffer;
    if (values == null) return;
    if (!Array.isArray(values) && !ArrayBuffer.isView(values)) throw new TypeError("clear values must be a four-component array");
    if (values.length !== 4) throw new RangeError("clear values must contain four components");
    this.clearWithFloat = values instanceof Float32Array || values.some(value => !Number.isInteger(value));
    if (this.clearWithFloat)
    {
      vec4.set(this.floatValue, Number(values[0]), Number(values[1]), Number(values[2]), Number(values[3]));
    }
    else
    {
      this.bitValue0 = Number(values[0]) >>> 0;
      this.bitValue1 = Number(values[1]) >>> 0;
      this.bitValue2 = Number(values[2]) >>> 0;
      this.bitValue3 = Number(values[3]) >>> 0;
    }
  }

  /**
   * Clears the bound unordered-access buffer to its configured value.
   */
  @carbon.method
  @impl.adapted
  Execute(_realTime, _simTime, executor)
  {
    if (this.buffer)
    {
      const value = this.clearWithFloat
        ? this.floatValue
        : [this.bitValue0, this.bitValue1, this.bitValue2, this.bitValue3];
      executor.ClearUav(this.buffer, value, this.clearWithFloat);
    }
    return TriRenderStep.Result.RS_OK;
  }

}
