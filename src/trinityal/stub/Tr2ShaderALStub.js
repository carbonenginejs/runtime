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
//   ShaderType enum, and that is what this uses. It said `null` until
//   2026-09-08, on an argument that was wrong twice: the enum it named,
//   `ShaderStageType`, is the RESOURCE layer's, while Carbon's
//   `Tr2RenderContextEnum::ShaderType` is ported in `global/consts` - which
//   `layers.json` permits trinityal to import, and which exists precisely to
//   be reached into for shared constants. Substituting `null` for a sentinel
//   the enum already carries is itself the second spelling it warned about.
//   The stage is otherwise opaque to the AL: it is stored and compared, and
//   the program's duplicate check shifts it, nothing more.
// - The signature IS STORED. Carbon's stub takes one and drops it on the floor
//   (`Tr2ShaderALStub.cpp:20-24`), so its `GetSignature` always answers an
//   empty one; its real backends keep it. Dropping caller data is a shortcut
//   that is harmless only while nothing reads it, and the register map will.

import { CjsSchema } from "#schema";
import { Tr2ALMemoryType, Tr2DeviceResourceAL } from "../Tr2DeviceResourceAL/index.js";
import { ALResult } from "../ALResult.js";
import { ShaderType } from "#consts/render-context";


/**
 * A compiled shader for one pipeline stage.
 */
export class Tr2ShaderALStub extends Tr2DeviceResourceAL
{
  /** m_type - a Carbon `ShaderType`. */
  _type = ShaderType.INVALID_SHADER;

  /** m_bytecode - a copy, not a view of the caller's buffer. */
  _bytecode = new Uint8Array(0);

  /** m_signature */
  _signature = null;

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

    this._bytecode = new Uint8Array(bytecode.byteLength);
    this._bytecode.set(new Uint8Array(bytecode.buffer, bytecode.byteOffset, bytecode.byteLength));
    this._type = type;
    this._signature = signature;

    return ALResult.S_OK;
  }

  /** Releases the bytecode and leaves the device-resource registry. */
  Destroy()
  {
    this._type = ShaderType.INVALID_SHADER;
    this._bytecode = new Uint8Array(0);
    this._signature = null;
    super.Destroy();
  }

  /**
   * Whether the shader has both a stage and bytecode.
   *
   * @returns {boolean} True when usable.
   */
  IsValid()
  {
    return this._type !== ShaderType.INVALID_SHADER && this._bytecode.length !== 0;
  }

  /**
   * The pipeline stage.
   *
   * @returns {number} A Carbon `ShaderType` value; INVALID_SHADER when unset.
   */
  GetType()
  {
    return this._type;
  }

  /**
   * The stored bytecode.
   *
   * @returns {{result: number, bytecode: Uint8Array|null}} The bytecode.
   */
  GetBytecode()
  {
    if (this._bytecode.length === 0) return { result: ALResult.E_INVALIDCALL, bytecode: null };

    return { result: ALResult.S_OK, bytecode: this._bytecode };
  }

  /**
   * The shader signature.
   *
   * @returns {object|null} The signature given at creation.
   */
  GetSignature()
  {
    return this._signature;
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
    this._type = type;
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
   * @param {string} _name The name Carbon would attach; the stub discards it.
   * @returns {number} An `ALResult` value; the stub keeps no name.
   */
  SetName(_name)
  {
    return ALResult.S_OK;
  }
}

// DECLARED AS A CALL, NOT A DECORATOR, for the reason recorded in
// Tr2BitmapDimensions.js: the layer is imported straight from source by its
// tests and raw Node cannot parse decorator syntax.
//
// The donor is NAMED rather than left to be derived from this class's name.
// Carbon calls every backend's class the same thing and carries the backend in
// the FILE name, because only one backend compiles at a time; we ship them
// together, so the backend moves onto the class name. That divergence is the
// author's to declare, never a checker's to guess.
CjsSchema.define(Tr2ShaderALStub, { className: "Tr2ShaderALStub", carbon: "Tr2ShaderAL" });
