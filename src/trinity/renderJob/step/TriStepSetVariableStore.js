// Source: trinity/trinity/RenderJob/TriStepSetVariableStore.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta, type, blue } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";
import { Tr2VariableStore } from "../../core/variable/Tr2VariableStore.js";
import { TriVariable } from "../../core/variable/TriVariable.js";
import { TriVariableContentType } from "../../generated/trinityCore/enums.js";

/** A render step that writes one named value into the variable store shaders read. */
@blue.define("TriStepSetVariableStore")
export class TriStepSetVariableStore extends TriRenderStep
{

  /** m_variableName (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  variableName = "";

  @blue.readwrite
  @type.rawStruct("TriVariableValue")
  value = null;

  /** Carbon method __init__ -> py__init__ (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @blue.method
  @meta.adapted
  __init__(name = undefined, value = undefined)
  {
    if (name !== undefined) this.SetName(name);
    if (value !== undefined && value !== null) this.SetValue(value);
  }

  /**
   * Sets the name of the variable this step writes.
   */
  @blue.method
  @meta.implemented
  SetName(name)
  {
    this.variableName = String(name ?? "");
  }

  /**
   * The value this step writes into the variable store.
   */
  @blue.method
  @meta.adapted
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
  @blue.method
  @meta.adapted
  SetValue(value)
  {
    this.value = ArrayBuffer.isView(value) || Array.isArray(value) ? value.slice() : value;
  }

  /**
   * Registers the named value on the global variable store, so shaders reading
   * that variable see it from this point in the job order onward.
   */
  @blue.method
  @meta.adapted
  Execute(_realTime, _simTime, _renderContext)
  {
    if (this.variableName && this.value !== null)
    {
      // Carbon keeps the type its Python bridge chose (TriStepSetVariableStore_Blue.cpp:66-110);
      // this step stores only the value, so the type is read from it.
      const contentType = TriVariable.getVariableType(this.value);
      if (contentType !== TriVariableContentType.TRIVARIABLE_INVALID)
        Tr2VariableStore.globalStore().RegisterVariableInternal(this.variableName, contentType, this.value);
    }
    return TriRenderStep.Result.RS_OK;
  }

}
