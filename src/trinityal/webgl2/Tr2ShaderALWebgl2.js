// Source: trinity/trinityal/dx11/Tr2ShaderALDx11.h
// Source: trinity/trinityal/dx11/Tr2ShaderALDx11.cpp
// Source: trinity/trinityal/include/Tr2ShaderAL.h
//
// The WebGL2 shader: one compiled GLSL ES 3.00 stage.
//
// BYTECODE HERE IS GLSL TEXT, NOT DXBC. Carbon hands its backends compiled
// bytecode because its shaders are compiled offline for one API. Ours arrive
// translated by the WebGL format (`resource/formats/webgl`), so the "bytecode"
// a shader carries is GLSL source. The AL contract stores bytes and a
// signature either way; WebGPU makes the same divergence with WGSL
// (`webgpu/CjsWebgpuShaderAL.js`).
//
// THE SIGNATURE'S BACKEND BLOCK is the WebGL format's per-pass record of what
// the GLSL declares but cannot say how to bind: uniform names per register,
// sampler pairings, data-texture formats, the vertex attribute layout, and the
// fragment-pass recipe for a compute stage. This shader decodes its own stage's
// entry once, at `Create`, so the program can bind from it; a block that is
// not a WebGL2 block is refused, as Metal refuses a signature it cannot honour
// (`Tr2ShaderALMetal.mm:24-27`) and as the WebGPU backend does.
//
// STAGES WebGL2 HAS: vertex and fragment. A compute stage is compiled as a
// FRAGMENT shader, because the emitter lowers map-style compute to a fragment
// pass (its `computeFragment` recipe); geometry, hull and domain stages have
// no WebGL2 counterpart and are refused.

import { CjsSchema, impl } from "#schema";
import { Tr2ALMemoryType, Tr2DeviceResourceAL } from "../Tr2DeviceResourceAL/index.js";
import { ALResult } from "../ALResult.js";
import { RenderContextALOf } from "../renderContextAL.js";
import { ShaderType } from "#consts/render-context";
import { readGlslBackendBlock } from "../../resource/formats/webgl/core/glslBackendBlock.js";


/** The WebGL format's stage name for each Carbon shader type WebGL2 can run. */
const GLSL_STAGE_NAME = Object.freeze({
  [ShaderType.VERTEX_SHADER]: "vertex",
  [ShaderType.PIXEL_SHADER]: "pixel",
  [ShaderType.COMPUTE_SHADER]: "compute"
});

/** GLSL source from a shader's bytecode. */
function GlslFrom(bytecode)
{
  if (typeof bytecode === "string") return bytecode;
  return new TextDecoder().decode(new Uint8Array(bytecode.buffer, bytecode.byteOffset, bytecode.byteLength));
}

/** UTF-8 bytes of a shader's bytecode, for `GetBytecode`. */
function BytesFrom(bytecode)
{
  if (typeof bytecode === "string") return new TextEncoder().encode(bytecode);
  return new Uint8Array(bytecode.buffer, bytecode.byteOffset, bytecode.byteLength).slice();
}


/**
 * One compiled shader stage on a WebGL2 device.
 */
export class Tr2ShaderALWebgl2 extends Tr2DeviceResourceAL
{
  /** m_type */
  _type = ShaderType.INVALID_SHADER;

  /** m_bytecode: the GLSL text as bytes. */
  _bytecode = new Uint8Array(0);

  /** m_signature */
  _signature = null;

  /** m_shader: the compiled `WebGLShader`, or null. */
  _shader = null;

  /** This stage's entry from the WebGL backend block, or null when the signature has none. */
  _stageBlock = null;

  /** The compiler's info log from the last failed compile. */
  _log = "";

  /** m_name */
  _name = "";

  /** The context the shader was created on. */
  _gl = null;

  /**
   * Creates and compiles the shader (`Tr2ShaderALDx11.cpp:11-96`).
   *
   * Refusals follow dx11: no device, static samplers in the signature (dx11
   * has no static samplers either), an unknown stage. Two are WebGL2's: a
   * stage it has no counterpart for, and a backend block that is not WebGL2's.
   * An empty shader answers `E_OUTOFMEMORY`, as Carbon's stub does.
   *
   * @param {number} type A `ShaderType` value.
   * @param {ArrayBufferView|string} bytecode GLSL source.
   * @param {object|null} signature The reflected signature.
   * @param {string|null} shaderPath Where it came from, for diagnostics.
   * @param {object} renderContext The context to create against.
   * @returns {number} An `ALResult` value.
   */
  @impl.adapted
  Create(type, bytecode, signature, shaderPath, renderContext)
  {
    this.ReleaseShader();

    const al = RenderContextALOf(renderContext);
    const gl = al ? al.GetWebgl2() : null;
    if (!gl) return ALResult.E_FAIL;

    if (signature && Array.isArray(signature.samplers) && signature.samplers.length) return ALResult.E_INVALIDARG;

    if (!bytecode || (bytecode.length === 0 && !bytecode.byteLength)) return ALResult.E_OUTOFMEMORY;

    const stageName = GLSL_STAGE_NAME[type];
    if (!stageName) return ALResult.E_INVALIDARG;

    let stageBlock = null;
    const block = signature ? signature.backendBlock : null;

    if (block && block.bytes && block.bytes.byteLength)
    {
      try
      {
        const decoded = readGlslBackendBlock(block.bytes, { source: shaderPath || "Tr2ShaderAL" });
        stageBlock = decoded.stages[stageName] ?? null;
      }
      catch
      {
        return ALResult.E_INVALIDARG;
      }
    }

    const shader = gl.createShader(type === ShaderType.VERTEX_SHADER ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER);
    if (!shader) return ALResult.E_OUTOFMEMORY;

    gl.shaderSource(shader, GlslFrom(bytecode));
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
    {
      this._log = gl.getShaderInfoLog(shader) ?? "";
      gl.deleteShader(shader);
      return ALResult.E_FAIL;
    }

    this._gl = gl;
    this._shader = shader;
    this._type = type;
    this._bytecode = BytesFrom(bytecode);
    this._signature = signature;
    this._stageBlock = stageBlock;
    this._log = "";

    return ALResult.S_OK;
  }

  /** Carbon's `ReleaseShader`: deletes the stage object and invalidates the type. */
  ReleaseShader()
  {
    if (this._gl && this._shader) this._gl.deleteShader(this._shader);

    this._shader = null;
    this._type = ShaderType.INVALID_SHADER;
  }

  /** Releases the shader and leaves the device-resource registry. */
  Destroy()
  {
    if (this.IsValid()) this.ReleaseShader();
    this._bytecode = new Uint8Array(0);
    this._signature = null;
    this._stageBlock = null;
    super.Destroy();
  }

  /**
   * Whether the shader compiled.
   *
   * @returns {boolean} True when it holds a stage.
   */
  IsValid()
  {
    return this._type !== ShaderType.INVALID_SHADER && this._shader !== null;
  }

  /**
   * The pipeline stage.
   *
   * @returns {number} A `ShaderType` value.
   */
  GetType()
  {
    return this._type;
  }

  /**
   * The stored bytecode, GLSL text as UTF-8 bytes.
   *
   * @returns {{result: number, bytecode: Uint8Array|null}} The bytecode.
   */
  GetBytecode()
  {
    if (this._type === ShaderType.INVALID_SHADER) return { result: ALResult.E_FAIL, bytecode: null };
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
   * Which memory class this shader occupies.
   *
   * @returns {number} A `Tr2ALMemoryType` value.
   */
  GetMemoryClass()
  {
    return Tr2ALMemoryType.AL_MEMORY_MANAGED;
  }

  /**
   * Describes the shader for the device-resource registry.
   *
   * @param {object} description The record to fill.
   */
  Describe(description)
  {
    description.type = "Tr2ShaderAL";
    description.name = this._name;
  }

  /**
   * Names the shader. WebGL has no debug names, so it is kept for `Describe`.
   *
   * @param {string} name The name.
   * @returns {number} An `ALResult` value.
   */
  SetName(name)
  {
    this._name = name;
    return ALResult.S_OK;
  }

  /**
   * The compiled `WebGLShader` the program attaches. dx11's program reads
   * `m_shader` as a friend.
   *
   * @returns {WebGLShader|null} The stage object.
   */
  @impl.custom
  GetGpuResource()
  {
    return this._shader;
  }

  /**
   * This stage's entry from the WebGL backend block: `{ bindings, stageInputs,
   * computeFragment? }`, or null when the signature carried no block.
   *
   * @returns {object|null} The stage block.
   */
  @impl.custom
  GetStageBlock()
  {
    return this._stageBlock;
  }

  /**
   * The compiler's info log from the last failed `Create`, for diagnostics.
   *
   * @returns {string} The log, empty after a successful compile.
   */
  @impl.custom
  GetCompileLog()
  {
    return this._log;
  }
}

CjsSchema.define(Tr2ShaderALWebgl2, { className: "Tr2ShaderALWebgl2", carbon: "Tr2ShaderAL" });
