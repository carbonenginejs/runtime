// Source: trinity/trinityal/stub/Tr2ShaderALStub.cpp
// Source: trinity/trinityal/stub/Tr2ShaderALStub.h
// Source: trinity/trinityal/include/Tr2ShaderAL.h
//
// A compiled shader as the backend holds it: a stage, its bytecode and its
// signature.
//
// The stub COPIES the bytecode rather than aliasing the caller's buffer, and
// that copy is the reason the type is worth having headless - a shader stays
// readable after whatever produced it has moved on, which is what a resource
// set will need when it comes to bind one.
//
// TWO NOTES ON FIDELITY.
//
// - Carbon's "no stage" is the `INVALID_SHADER` sentinel at the end of its
//   ShaderType enum. Here that is `null`, because JavaScript has a real
//   nothing, and because the ported enum (`ShaderStageType`) lives in the
//   resource layer - trinity does not reach into it for a constant, and a
//   second copy of an enum is how two spellings of the same thing start.
//   The stage is otherwise opaque to the AL: it is stored and compared, and
//   the program's duplicate check shifts it, nothing more.
// - The signature IS STORED. Carbon's stub takes one and drops it on the floor
//   (`Tr2ShaderALStub.cpp:20-24`), so its `GetSignature` always answers an
//   empty one; its real backends keep it. Dropping caller data is a shortcut
//   that is harmless only while nothing reads it, and the register map will.

import { Tr2ALMemoryType, Tr2BaseDeviceResourceAL } from "./Tr2DeviceResourceAL.js";
import { ALResult } from "./ALResult.js";


/**
 * A compiled shader for one pipeline stage.
 */
export class Tr2ShaderALStub extends Tr2BaseDeviceResourceAL
{
  /** m_type; null is Carbon's INVALID_SHADER. */
  #type = null;

  /** m_bytecode - a copy, not a view of the caller's buffer. */
  #bytecode = new Uint8Array(0);

  /** m_signature */
  #signature = null;

  /**
   * Creates the shader.
   *
   * @param {number} type The pipeline stage, as a Carbon `ShaderType` value.
   * @param {ArrayBufferView} bytecode The compiled bytecode.
   * @param {object|null} signature The shader signature.
   * @param {string|null} shaderPath Where it came from, for diagnostics.
   * @param {object} renderContext The context to create against.
   * @returns {number} An `ALResult` value.
   */
  Create(type, bytecode, signature, shaderPath, renderContext)
  {
    if (bytecode.byteLength === 0) return ALResult.E_OUTOFMEMORY;

    this.#bytecode = new Uint8Array(bytecode.byteLength);
    this.#bytecode.set(new Uint8Array(bytecode.buffer, bytecode.byteOffset, bytecode.byteLength));
    this.#type = type;
    this.#signature = signature;

    return ALResult.S_OK;
  }

  /** Releases the bytecode and leaves the device-resource registry. */
  Destroy()
  {
    this.#type = null;
    this.#bytecode = new Uint8Array(0);
    this.#signature = null;
    super.Destroy();
  }

  /**
   * Whether the shader has both a stage and bytecode.
   *
   * @returns {boolean} True when usable.
   */
  IsValid()
  {
    return this.#type !== null && this.#bytecode.length !== 0;
  }

  /**
   * The pipeline stage.
   *
   * @returns {number|null} A Carbon `ShaderType` value, or null when unset.
   */
  GetType()
  {
    return this.#type;
  }

  /**
   * The stored bytecode.
   *
   * @returns {{result: number, bytecode: Uint8Array|null}} The bytecode.
   */
  GetBytecode()
  {
    if (this.#bytecode.length === 0) return { result: ALResult.E_INVALIDCALL, bytecode: null };

    return { result: ALResult.S_OK, bytecode: this.#bytecode };
  }

  /**
   * The shader signature.
   *
   * @returns {object|null} The signature given at creation.
   */
  GetSignature()
  {
    return this.#signature;
  }

  /**
   * Claims a stage without bytecode, for a deliberately empty shader.
   *
   * Carbon uses this for null shaders - a stage the pipeline must name but
   * that does no work. The shader stays INVALID, which is the point.
   *
   * @param {number} type The pipeline stage.
   */
  SetNullShaderType(type)
  {
    this.#type = type;
  }

  /**
   * Which memory class this shader occupies.
   *
   * @returns {number} A `Tr2ALMemoryType` value.
   */
  GetMemoryClass()
  {
    return Tr2ALMemoryType.AL_MEMORY_MANAGED;
  }

  /**
   * Names the shader for a debugger.
   *
   * @returns {number} An `ALResult` value; the stub keeps no name.
   */
  SetName()
  {
    return ALResult.S_OK;
  }
}
