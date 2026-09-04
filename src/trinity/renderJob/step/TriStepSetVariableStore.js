// Source: trinity/trinity/RenderJob/TriStepSetVariableStore.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";
import { Tr2VariableStore } from "../../core/variable/Tr2VariableStore.js";

/** A render step that writes one named value into the variable store shaders read. */
@type.define({ className: "TriStepSetVariableStore", family: "renderJob" })
export class TriStepSetVariableStore extends TriRenderStep
{

  /** m_variableName (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  variableName = "";

  @io.readwrite
  @type.rawStruct("TriVariableValue")
  value = null;

  /** Carbon method __init__ -> py__init__ (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @carbon.method
  @impl.adapted
  __init__(name = undefined, value = undefined)
  {
    if (name !== undefined) this.SetName(name);
    if (value !== undefined && value !== null) this.SetValue(value);
  }

  /**
   * Sets the name of the variable this step writes.
   */
  @carbon.method
  @impl.implemented
  SetName(name)
  {
    this.variableName = String(name ?? "");
  }

  /**
   * The value this step writes into the variable store.
   */
  @carbon.method
  @impl.adapted
  GetValue()
  {
    if (ArrayBuffer.isView(this.value)) return this.value.slice();
    if (Array.isArray(this.value)) return this.value.slice();
    return this.value;
  }

  /**
   * Sets the value this step writes, copying array and typed-array values so a
   * later mutation by the caller cannot change what the step publishes.
   */
  @carbon.method
  @impl.adapted
  SetValue(value)
  {
    this.value = ArrayBuffer.isView(value) || Array.isArray(value) ? value.slice() : value;
  }

  /**
   * Registers the named value on the global variable store, so shaders reading
   * that variable see it from this point in the job order onward.
   */
  @carbon.method
  @impl.adapted
  Execute(_realTime, _simTime, _renderContext)
  {
    if (this.variableName && this.value !== null) Tr2VariableStore.GlobalStore().RegisterVariable(this.variableName, this.value);
    return TriRenderStep.Result.RS_OK;
  }

}
