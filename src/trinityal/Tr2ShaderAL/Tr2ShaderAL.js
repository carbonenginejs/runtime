// Source: trinity/trinityal/include/Tr2ShaderAL.h
// Source: trinity/trinityal/src/Tr2ShaderAL.cpp
//
// The backend-neutral shader: Carbon's PIMPL value. The effect state manager
// holds one per registered stage (`s_shaders`, `Tr2EffectStateManager.cpp:500-509`),
// it is invalid until `Create` fills it, and a program links an array of them
// (`Tr2ShaderProgramAL::Create( Tr2ShaderAL* shaders, count, ... )`), reading
// each one's implementation as a friend (`Tr2ShaderAL.h:193-194`).
//
// The render context allocates the implementation where Carbon includes the
// platform's `TrinityALImpl::Tr2ShaderAL` at compile time
// (`TRINITY_AL_PLATFORM_INCLUDE`, `Tr2ShaderAL.cpp:6`): we ship every backend
// at once, so the context that knows its backend is the factory
// (`CreateShader(type, bytecode, signature, shaderPath, true)`).
//
// Tr2ShaderBytecodeAL, Tr2ShaderPipelineInputAL, Tr2ShaderRegisterAL and
// Tr2ShaderSignatureAL, declared in the same header, are plain records here
// (a typed array and the shader compiler's signature object); they are not
// ported as classes by this file.
import { CjsSchema, meta, blue, type } from "#schema";
import { Tr2ALMemoryType } from "#consts/graphics";
import { ShaderType } from "#consts/render-context";
import { ALResult, Failed } from "../ALResult.js";
import { RenderContextALOf } from "../renderContextAL.js";


/**
 * Carbon's `NullShader()` (`Tr2ShaderAL.cpp:10-14`): the one shared default
 * implementation every uncreated handle points at. Carbon's is the platform
 * impl default-constructed; the handle here is backend-neutral, so this
 * answers as the stub's default-constructed impl does - `INVALID_SHADER`, no
 * bytecode (so `E_INVALIDCALL`), an empty signature, managed memory
 * (`Tr2ShaderALStub.cpp:14-73`, `Tr2ShaderALStub.h:37-40`). Its share count is
 * unbounded, so releasing a default handle never destroys it.
 */
const nullShader = {
  owners: Infinity,
  implementation: {
    IsValid: () => false,
    GetType: () => ShaderType.INVALID_SHADER,
    GetBytecode: () => ({ result: ALResult.E_INVALIDCALL, bytecode: null }),
    GetSignature: () => null,
    GetMemoryClass: () => Tr2ALMemoryType.AL_MEMORY_MANAGED,
    SetName: () => ALResult.S_OK,
    Destroy: () => undefined
  }
};


/** A shader value sharing one backend implementation. */
export class Tr2ShaderAL
{
  /** m_shader: the shared implementation record; `nullShader` until created. */
  _shader = nullShader;

  /**
   * Carbon's default constructor (`Tr2ShaderAL.cpp:132-135`) leaves the value
   * on `NullShader()`. A `copy` replaces C++'s implicit copy construction,
   * sharing the implementation; plain JavaScript assignment aliases instead.
   *
   * @param {object} [options] Copy construction.
   * @param {Tr2ShaderAL|null} [options.copy] The value to share.
   */
  constructor({ copy = null } = {})
  {
    if (copy)
    {
      this._shader = copy._shader;
      this._shader.owners += 1;
    }
  }

  /**
   * Carbon's private Tr2ShaderAL( shared_ptr<TrinityALImpl::Tr2ShaderAL> )
   * (`Tr2ShaderAL.h:189`, `Tr2ShaderAL.cpp:137-140`): a value around an
   * existing implementation. Carbon keeps it for its friends; ours serves a
   * backend's own code and tests that build an implementation directly.
   *
   * @param {object} shader A backend shader implementation.
   * @returns {Tr2ShaderAL} The value.
   */
  static create__Shader(shader)
  {
    const value = new Tr2ShaderAL();
    value._shader = { implementation: shader, owners: 1 };
    return value;
  }

  /**
   * Carbon's Create( type, bytecode, signature, shaderPath, renderContext )
   * (`Tr2ShaderAL.h:168-173`, `Tr2ShaderAL.cpp:142-156`): a fresh
   * implementation replaces this value's; a failure leaves it on the null
   * implementation.
   *
   * Adapted: the render context allocates the implementation instead of a
   * compile-time platform include. The previous share is released explicitly
   * because JavaScript has no shared_ptr; existing copies keep it alive.
   *
   * @param {number} shaderType A `ShaderType`.
   * @param {ArrayBufferView|string} bytecode The stage's bytecode.
   * @param {object|null} signature The reflected signature.
   * @param {string} shaderPath Where it came from, for diagnostics.
   * @param {object} renderContext The primary context to create against.
   * @returns {number} An `ALResult` value.
   */
  @blue.method
  @meta.adapted
  Create(shaderType, bytecode, signature, shaderPath, renderContext)
  {
    this.Destroy();

    const { result, implementation } = RenderContextALOf(renderContext).CreateShader(shaderType, bytecode, signature, shaderPath, true);
    if (Failed(result)) return result;

    this._shader = { implementation, owners: 1 };
    return result;
  }

  /**
   * Whether the implementation is usable (`Tr2ShaderAL.cpp:158-161`).
   *
   * @returns {boolean} True once created.
   */
  @blue.method
  @meta.implemented
  IsValid()
  {
    return this._shader.implementation.IsValid();
  }

  /**
   * The pipeline stage (`Tr2ShaderAL.cpp:163-166`).
   *
   * @returns {number} A `ShaderType`; `INVALID_SHADER` when uncreated.
   */
  @blue.method
  @meta.implemented
  GetType()
  {
    return this._shader.implementation.GetType();
  }

  /**
   * The stored bytecode (`Tr2ShaderAL.cpp:168-171`).
   *
   * Adapted: Carbon's `Tr2ShaderBytecodeAL&` output becomes the returned
   * `bytecode`.
   *
   * @returns {{result: number, bytecode: ArrayBufferView|null}} The bytecode.
   */
  @blue.method
  @meta.adapted
  GetBytecode()
  {
    return this._shader.implementation.GetBytecode();
  }

  /**
   * The signature given at creation (`Tr2ShaderAL.cpp:173-176`).
   *
   * @returns {object|null} The signature.
   */
  @blue.method
  @meta.implemented
  GetSignature()
  {
    return this._shader.implementation.GetSignature();
  }

  /**
   * Compares implementation identity (`Tr2ShaderAL.cpp:178-181`).
   *
   * Adapted: JavaScript has no overloadable equality operator.
   *
   * @param {Tr2ShaderAL} other The value to compare.
   * @returns {boolean} Whether both share one implementation.
   */
  @blue.method
  @meta.adapted
  Equals(other)
  {
    return this._shader === other._shader;
  }

  /**
   * Compares implementation identity, negated (`Tr2ShaderAL.cpp:183-186`).
   *
   * Adapted: JavaScript has no overloadable inequality operator.
   *
   * @param {Tr2ShaderAL} other The value to compare.
   * @returns {boolean} Whether the two hold different implementations.
   */
  @blue.method
  @meta.adapted
  NotEquals(other)
  {
    return this._shader !== other._shader;
  }

  /**
   * Names valid storage; an invalid value or an absent name keeps Carbon's
   * errors (`Tr2ShaderAL.cpp:188-199`).
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
    return this._shader.implementation.SetName(name);
  }

  /**
   * The shared backend implementation (`Tr2ShaderAL.cpp:201-204`); the null
   * implementation when uncreated, as Carbon returns `NullShader().get()`.
   *
   * @returns {object} The implementation.
   */
  @blue.method
  @meta.implemented
  TrinityALImpl_GetObject()
  {
    return this._shader.implementation;
  }

  /**
   * Resets this value to the null implementation, Carbon's
   * `shader = Tr2ShaderAL()`.
   *
   * Ours (no blue stamp): JavaScript has no scope destructor or shared_ptr, so
   * the share is released explicitly; the implementation is destroyed with its
   * last share.
   */
  Destroy()
  {
    const owned = this._shader;
    this._shader = nullShader;
    if (--owned.owners === 0) owned.implementation.Destroy();
  }
}

CjsSchema.decorateField(Tr2ShaderAL, "_shader", type.unknown);
CjsSchema.decorateMethod(Tr2ShaderAL, "Equals", meta.renamed("operator=="));
CjsSchema.decorateMethod(Tr2ShaderAL, "NotEquals", meta.renamed("operator!="));
CjsSchema.blue.define(Tr2ShaderAL, { className: "Tr2ShaderAL" });
