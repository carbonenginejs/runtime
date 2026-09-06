// Source: trinity/trinityal/include/Tr2ShaderAL.h
//   trinity/trinityal/stub/Tr2ShaderALStub.cpp
//   trinity/trinityal/include/Tr2ShaderProgramAL.h
//
// The device-backed half of Carbon's shader pair, and the second piece of the
// immediate-draw route after `CjsWebgpuBufferAL`.
//
// WHY THESE EXIST. Carbon's draws all begin with `SetAllState`, which resolves a
// pipeline from an incrementally described PSO (`Tr2RenderContextDx12.cpp:810`,
// `:793-807`). The description's shader half is a `Tr2ShaderProgramAL` - a real
// linked program, not a handle - so a backend that cannot produce one cannot
// build a pipeline, and `SetStreamSource` + `DrawPrimitive` stay recording-only.
// That is exactly where `Tr2Blitter` currently stops.
//
// BYTECODE HERE IS WGSL TEXT, NOT DXBC. Carbon hands its backends compiled
// bytecode because its shaders are compiled offline for one API. Ours arrive as
// translated WGSL from the effect container, so the "bytecode" a shader carries
// is UTF-8 source. The AL contract does not care - it stores bytes and a
// signature - and the divergence is here rather than in Trinity, which is where
// Carbon puts every other API difference too.
import { ALResult } from "#trinityal";


/** Decodes a shader's bytecode as WGSL source. */
function wgslFrom(bytecode)
{
  if (typeof bytecode === "string") return bytecode;

  const bytes = bytecode instanceof Uint8Array
    ? bytecode
    : new Uint8Array(bytecode.buffer, bytecode.byteOffset, bytecode.byteLength);

  return new TextDecoder().decode(bytes);
}


/**
 * A `Tr2ShaderAL` holding a real `GPUShaderModule`.
 *
 * Carbon's stub COPIES the bytecode so a shader stays readable after whatever
 * produced it moved on. This keeps the source for the same reason: a pipeline
 * built later needs the entry point and the module, and a compilation error
 * needs the text to report against.
 */
export class CjsWebgpuShaderAL
{
  /** m_type - the stage, opaque to the AL: stored and compared, never read. */
  #type = null;

  /** m_signature */
  #signature = null;

  /** The WGSL this module was compiled from. */
  #source = "";

  /** The compiled module, or null before Create. */
  #module = null;

  #webgpu = null;

  /**
   * Compiles the shader.
   *
   * @param {*} type The stage; `null` is Carbon's `INVALID_SHADER`.
   * @param {ArrayBufferView|string} bytecode WGSL source.
   * @param {object|null} signature The reflected signature.
   * @param {string} shaderPath A debug label.
   * @param {object} renderContext The WebGPU render context AL.
   * @returns {number} An `ALResult` value.
   */
  Create(type, bytecode, signature, shaderPath, renderContext)
  {
    this.Destroy();

    // Carbon's stub reports OUT_OF_MEMORY for empty bytecode rather than
    // INVALIDARG (`Tr2ShaderALStub.cpp`), and the odd choice is transcribed
    // rather than tidied: a caller testing for it would not recognise a
    // different code.
    if (!bytecode || (bytecode.byteLength === 0 && bytecode.length === 0)) return ALResult.E_OUTOFMEMORY;

    if (!renderContext || !renderContext.IsValid()) return ALResult.E_INVALIDCALL;

    const webgpu = renderContext.GetWebgpu();
    if (!webgpu) return ALResult.E_INVALIDCALL;

    this.#source = wgslFrom(bytecode);
    this.#module = webgpu.GetDevice().createShaderModule({
      label: shaderPath || "Tr2ShaderAL",
      code: this.#source
    });
    this.#webgpu = webgpu;
    this.#type = type;
    this.#signature = signature;

    return ALResult.S_OK;
  }

  /** Whether the shader compiled. */
  IsValid()
  {
    return this.#module !== null;
  }

  /** The stage this shader was created for. */
  GetType()
  {
    return this.#type;
  }

  /** The WGSL this was compiled from, as bytes, matching the stub's contract. */
  GetBytecode()
  {
    return new TextEncoder().encode(this.#source);
  }

  /** The reflected signature. */
  GetSignature()
  {
    return this.#signature;
  }

  /** The `GPUShaderModule`, for a pipeline to reference. */
  GetModule()
  {
    return this.#module;
  }

  /** Releases the module. */
  Destroy()
  {
    // A GPUShaderModule has no destroy(); it is released when nothing
    // references it. Dropping the reference is the whole of it.
    this.#module = null;
    this.#webgpu = null;
    this.#type = null;
    this.#signature = null;
    this.#source = "";
  }
}


/**
 * A `Tr2ShaderProgramAL` linking compiled stages.
 *
 * Carbon's program is what a PSO description names, and its stub records which
 * stages were supplied as a mask. WebGPU has no link step - a render pipeline
 * takes the vertex and fragment modules directly - so this holds the stages and
 * answers for them, which is the part the pipeline description needs.
 */
export class CjsWebgpuShaderProgramAL
{
  /** m_shaders, in the order given. */
  #shaders = [];

  /**
   * Links the shaders into a program.
   *
   * @param {object[]} shaders The `CjsWebgpuShaderAL`s to link.
   * @param {object} renderContext The context to link against.
   * @returns {number} An `ALResult` value.
   */
  Create(shaders, renderContext)
  {
    this.Destroy();

    if (!renderContext || !renderContext.IsValid()) return ALResult.E_INVALIDCALL;
    if (!shaders || shaders.length === 0) return ALResult.E_INVALIDARG;

    // A program with an uncompiled stage would fail at pipeline creation with a
    // message about the pipeline, not the shader. Refuse where the cause is.
    for (const shader of shaders)
    {
      if (!shader || !shader.IsValid()) return ALResult.E_INVALIDARG;
    }

    this.#shaders = shaders.slice();

    return ALResult.S_OK;
  }

  /** Whether the program linked. */
  IsValid()
  {
    return this.#shaders.length > 0;
  }

  /** The linked shaders, in the order they were given. */
  GetShaders()
  {
    return this.#shaders;
  }

  /**
   * The module for one stage, or null when the program has no such stage.
   *
   * @param {*} type The stage to find.
   * @returns {GPUShaderModule|null} Its module.
   */
  GetModuleFor(type)
  {
    const shader = this.#shaders.find(candidate => candidate.GetType() === type);

    return shader ? shader.GetModule() : null;
  }

  /** Releases the linked shaders. */
  Destroy()
  {
    this.#shaders = [];
  }
}
