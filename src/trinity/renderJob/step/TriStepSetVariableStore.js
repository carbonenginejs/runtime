// Source: trinity/trinity/RenderJob/TriStepSetVariableStore.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { CjsSchema, meta, type, blue } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";
import { Tr2VariableStore } from "../../core/variable/Tr2VariableStore.js";
import { TriVariable } from "../../core/variable/TriVariable.js";
import { TriVariableContentType } from "../../generated/trinityCore/enums.js";
import { ITr2TextureProvider } from "../../core/ITr2TextureProvider.js";
import { ITr2GpuBuffer } from "../../core/ITr2GpuBuffer.js";
import { TriTextureRes } from "#resource/texture";

/** A render step that writes one named value into the variable store shaders read. */
@blue.define("TriStepSetVariableStore")
@blue.interface(TriRenderStep)
@blue.chainTo(TriRenderStep)
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
      const contentType = TriStepSetVariableStore._ExtractVariableType(this.value);
      if (contentType !== TriVariableContentType.TRIVARIABLE_INVALID)
        Tr2VariableStore.globalStore().RegisterVariableInternal(this.variableName, contentType, this.value);
    }
    return TriRenderStep.Result.RS_OK;
  }

  /**
   * Carbon SetValue's argument extraction (TriStepSetVariableStore_Blue.cpp:53-110):
   * the first of texture provider, GPU buffer, int, float, Vector2, Vector3,
   * Vector4, Matrix and Color the value converts to fixes m_type, through the
   * matching GetVariableType overload; nothing converting leaves INVALID.
   *
   * Adapted: Carbon runs this in SetValue against a Python object; this step
   * stores the JavaScript value as given and extracts at Execute. A JS number
   * has no int/float split, so an integral number extracts as int, as a Python
   * int does. TriTextureRes is cast for separately because it does not yet
   * inherit ITr2TextureProvider, as Carbon's does (TriTextureRes.h).
   *
   * @param {*} value The stored value.
   * @returns {number} A TriVariableContentType.
   */
  static _ExtractVariableType(value)
  {
    if (CjsSchema.cast(value, ITr2TextureProvider) || CjsSchema.cast(value, TriTextureRes))
    {
      return TriVariable.getVariableType__ITr2TextureProvider();
    }
    if (CjsSchema.cast(value, ITr2GpuBuffer)) return TriVariable.getVariableType__ITr2GpuBuffer();
    if (typeof value === "boolean") return TriVariable.getVariableType__int();
    if (typeof value === "number")
    {
      return Number.isInteger(value) ? TriVariable.getVariableType__int() : TriVariable.getVariableType__float();
    }
    if (Array.isArray(value) || ArrayBuffer.isView(value))
    {
      switch (value.length)
      {
        case 2: return TriVariable.getVariableType__Vector2();
        case 3: return TriVariable.getVariableType__Vector3();
        // A four-component value converts to Vector4 before Color is tried.
        case 4: return TriVariable.getVariableType__Vector4();
        case 16: return TriVariable.getVariableType__Matrix();
      }
    }
    return TriVariableContentType.TRIVARIABLE_INVALID;
  }

}
