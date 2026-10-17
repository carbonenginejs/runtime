// Source: trinity/trinityal/include/Tr2ShaderProgramAL.h
// Source: trinity/trinityal/src/Tr2ShaderProgramAL.cpp
//
// The backend-neutral shader program: Carbon's PIMPL value. The effect state
// manager holds one per registered program (`s_shaderPrograms`,
// `Tr2EffectStateManager.cpp:572-576`), it is invalid until `Create` links an
// array of `Tr2ShaderAL` values into it, a render context holds the bound one
// by value (`Tr2RenderContextDx11.cpp:1569-1606`), and a resource set lays its
// entries out against it (`Tr2ResourceSetAL::Create( description, program, ... )`).
//
// The render context allocates the implementation where Carbon includes the
// platform's `TrinityALImpl::Tr2ShaderProgramAL` at compile time
// (`TRINITY_AL_PLATFORM_INCLUDE`, `Tr2ShaderProgramAL.cpp:5`): we ship every
// backend at once, so the context that knows its backend is the factory
// (`CreateShaderProgram(shaders, count, true)`).
import { CjsSchema, meta, blue, type } from "#schema";
import { Tr2ALMemoryType } from "#consts/graphics";
import { ALResult, Failed } from "../ALResult.js";
import { RenderContextALOf } from "../renderContextAL.js";
import { Tr2RegisterMapAL } from "../Tr2ResourceSetAL/Tr2RegisterMapAL.js";


/**
 * Carbon's `NullProgram()` (`Tr2ShaderProgramAL.cpp:10-14`): the one shared
 * default implementation every uncreated handle points at. Carbon's is the
 * platform impl default-constructed; the handle here is backend-neutral, so
 * this answers as the stub's default-constructed impl does - invalid, an empty
 * register map, managed memory (`Tr2ShaderProgramALStub.cpp:15-80`). Its share
 * count is unbounded, so releasing a default handle never destroys it.
 */
const nullRegisterMap = new Tr2RegisterMapAL();
const nullProgram = {
  owners: Infinity,
  implementation: {
    IsValid: () => false,
    GetMemoryClass: () => Tr2ALMemoryType.AL_MEMORY_MANAGED,
    GetRegisterMap: () => nullRegisterMap,
    SetName: () => ALResult.S_OK,
    Destroy: () => undefined
  }
};


/** A shader program value sharing one backend implementation. */
export class Tr2ShaderProgramAL
{
  /** m_program: the shared implementation record; `nullProgram` until created. */
  _program = nullProgram;

  /**
   * Carbon's default constructor (`Tr2ShaderProgramAL.cpp:18-21`) leaves the
   * value on `NullProgram()`. A `copy` replaces C++'s implicit copy
   * construction, sharing the implementation; plain JavaScript assignment
   * aliases instead.
   *
   * @param {object} [options] Copy construction.
   * @param {Tr2ShaderProgramAL|null} [options.copy] The value to share.
   */
  constructor({ copy = null } = {})
  {
    if (copy)
    {
      this._program = copy._program;
      this._program.owners += 1;
    }
  }

  /**
   * Carbon's Create( shaders, count, renderContext ) (`Tr2ShaderProgramAL.h:38`,
   * `Tr2ShaderProgramAL.cpp:23-32`): a fresh implementation links the first
   * `count` shaders and replaces this value's; a failure leaves it on the null
   * implementation.
   *
   * Adapted: the render context allocates the implementation instead of a
   * compile-time platform include, and Carbon's `Tr2ShaderAL*` array is a
   * JavaScript array of `Tr2ShaderAL` values. The previous share is released
   * explicitly because JavaScript has no shared_ptr.
   *
   * @param {import("../Tr2ShaderAL/Tr2ShaderAL.js").Tr2ShaderAL[]} shaders The stages.
   * @param {number} count How many of them to link.
   * @param {object} renderContext The primary context to create against.
   * @returns {number} An `ALResult` value.
   */
  @blue.method
  @meta.adapted
  Create(shaders, count, renderContext)
  {
    this.Destroy();

    const { result, implementation } = RenderContextALOf(renderContext).CreateShaderProgram(shaders, count, true);
    if (Failed(result)) return result;

    this._program = { implementation, owners: 1 };
    return result;
  }

  /**
   * Carbon's CreateCommandSignatures( bufferLayout, renderContext )
   * (`Tr2ShaderProgramAL.cpp:34-43`): DX12 alone builds indirect command
   * signatures, and every other backend answers `E_FAIL`. No JavaScript
   * backend is DX12, so this is Carbon's non-DX12 branch.
   *
   * @param {object} _bufferLayout A `Tr2IndirectBufferLayoutAL`.
   * @param {object} _renderContext The primary context.
   * @returns {number} `E_FAIL`.
   */
  @blue.method
  @meta.implemented
  CreateCommandSignatures(_bufferLayout, _renderContext)
  {
    return ALResult.E_FAIL;
  }

  /**
   * Whether the program linked (`Tr2ShaderProgramAL.cpp:45-48`).
   *
   * @returns {boolean} True once created.
   */
  @blue.method
  @meta.implemented
  IsValid()
  {
    return this._program.implementation.IsValid();
  }

  /**
   * The implementation's memory class (`Tr2ShaderProgramAL.cpp:50-53`).
   *
   * @returns {number} A `Tr2ALMemoryType` value.
   */
  @blue.method
  @meta.implemented
  GetMemoryClass()
  {
    return this._program.implementation.GetMemoryClass();
  }

  /**
   * Compares implementation identity (`Tr2ShaderProgramAL.cpp:55-58`).
   *
   * Adapted: JavaScript has no overloadable equality operator.
   *
   * @param {Tr2ShaderProgramAL} other The value to compare.
   * @returns {boolean} Whether both share one implementation.
   */
  @blue.method
  @meta.adapted
  Equals(other)
  {
    return this._program === other._program;
  }

  /**
   * The program's register map (`Tr2ShaderProgramAL.cpp:60-63`).
   *
   * @returns {Tr2RegisterMapAL} The map; empty when uncreated.
   */
  @blue.method
  @meta.implemented
  GetRegisterMap()
  {
    return this._program.implementation.GetRegisterMap();
  }

  /**
   * Names valid storage; an invalid value or an absent name keeps Carbon's
   * errors (`Tr2ShaderProgramAL.cpp:65-76`).
   *
   * @param {string} name The name.
   * @returns {number} An `ALResult` value.
   */
  @blue.method
  @meta.implemented
  SetName(name)
  {
    if (!this.IsValid()) return ALResult.E_INVALIDCALL;
    if (name === null || name === undefined) return ALResult.E_INVALIDARG;
    return this._program.implementation.SetName(name);
  }

  /**
   * The shared backend implementation (`Tr2ShaderProgramAL.cpp:78-81`); the
   * null implementation when uncreated, as Carbon returns `NullProgram().get()`.
   *
   * @returns {object} The implementation.
   */
  @blue.method
  @meta.implemented
  TrinityALImpl_GetObject()
  {
    return this._program.implementation;
  }

  /**
   * Resets this value to the null implementation, Carbon's
   * `m_shaderProgram = Tr2ShaderProgramAL()`.
   *
   * Ours (no blue stamp): JavaScript has no scope destructor or shared_ptr, so
   * the share is released explicitly; the implementation is destroyed with its
   * last share.
   */
  Destroy()
  {
    const owned = this._program;
    this._program = nullProgram;
    if (--owned.owners === 0) owned.implementation.Destroy();
  }
}

CjsSchema.decorateField(Tr2ShaderProgramAL, "_program", type.unknown);
CjsSchema.decorateMethod(Tr2ShaderProgramAL, "Equals", meta.renamed("operator=="));
CjsSchema.blue.define(Tr2ShaderProgramAL, { className: "Tr2ShaderProgramAL" });
