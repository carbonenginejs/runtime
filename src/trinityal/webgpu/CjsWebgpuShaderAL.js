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
import { ALResult, Tr2ALMemoryType } from "#trinityal";
import { ShaderType } from "#consts/render-context";


/**
 * Carbon's ShaderType to the stage name WebGPU's pipeline descriptor wants.
 *
 * The stage is carried as Carbon's INTEGER ENUM everywhere, and becomes a
 * string only here, at the one boundary that genuinely demands one.
 *
 * It used to be a string throughout, which was an unforced divergence: an
 * integer enum is perfectly expressible in JavaScript, Carbon's
 * `Tr2RenderContextEnum::ShaderType` is ALREADY ported in `global/consts`
 * (`renderContext/pipeline.js`) from that same header, and `layers.json`
 * explicitly permits `trinityal` to import `global/consts`. Carrying strings
 * also silently broke the duplicate-stage check, which Carbon writes as
 * `1 << GetType()` - shifting by a string puts every stage on bit 0.
 */
export const WEBGPU_STAGE_NAME = Object.freeze({
    [ShaderType.VERTEX_SHADER]: "vertex",
    [ShaderType.PIXEL_SHADER]: "fragment",
    [ShaderType.COMPUTE_SHADER]: "compute"
});


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
  /** m_type - a Carbon `ShaderType`; `INVALID_SHADER` until Create succeeds. */
  #type = ShaderType.INVALID_SHADER;

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
   * @param {number} type A Carbon `ShaderType` value.
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

  /**
   * Whether the shader compiled AND carries a stage.
   *
   * Carbon is `m_type != INVALID_SHADER && !m_bytecode.empty()`
   * (`Tr2ShaderALStub.cpp:48-51`) - both halves, on every backend. Testing the
   * module alone accepted a shader with no stage, which a program would then
   * link and resolve `GetModuleFor` against.
   */
  IsValid()
  {
    return this.#module !== null && this.#type !== ShaderType.INVALID_SHADER;
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
    this.#type = ShaderType.INVALID_SHADER;
    this.#signature = null;
    this.#source = "";
  }

  /**
   * Claims a stage without bytecode, for a deliberately empty shader.
   *
   * The shader stays INVALID, which is the point: the pipeline must name the
   * stage, and nothing must try to reference a module for it.
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
   * Fills in a device-resource description.
   *
   * @param {object} description The description to fill.
   * @returns {object} The description, filled.
   */
  Describe(description)
  {
    if (!description) return description;

    description.memoryClass = this.GetMemoryClass();

    return description;
  }

  /**
   * Names the shader for a debugger.
   *
   * `GPUShaderModule` carries a writable `label`, and it is what a WebGPU
   * compilation error quotes - so unlike the stub this keeps the name.
   *
   * @param {string} name The name to attach.
   * @returns {number} An `ALResult` value.
   */
  SetName(name)
  {
    if (this.#module) this.#module.label = String(name);

    return ALResult.S_OK;
  }
}


/**
 * A `Tr2ShaderProgramAL` linking compiled stages.
 *
 * Carbon's program is what a PSO description names, and its stub records which
 * stages were supplied as a mask. WebGPU has no link step - a render pipeline
 * takes the vertex and fragment modules directly - so this holds the stages and
 * answers for them, which is the part the pipeline description needs.
 *
 * TWO OF CARBON'S PROGRAM METHODS ARE NOT HERE.
 *
 * `CreateCommandSignatures` builds D3D12 indirect-command signatures. It is
 * declared on the shared header but implemented only by DX12
 * (`dx12/Tr2ShaderProgramALDx12.cpp:357`); metal and the stub both omit it, and
 * so does our stub.
 *
 * `GetRegisterMap` answers which registers the program reads, per stage. THAT
 * INFORMATION EXISTS HERE, but not on this object: it is baked into the effect
 * container as the pass's bind-group declarations, which the package and
 * pipeline hold, not the program. Deriving it would mean this class reaching
 * back into the package that built it. Our stub omits the method deliberately
 * too, for its own reason recorded at `stub/Tr2ShaderProgramALStub.js:12-16`,
 * and closing both is part of the resource-set lane rather than a local fix.
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
    //
    // Two shaders of the SAME stage are refused for the same reason, and every
    // Carbon backend does it: the stub and Metal by bitmask
    // (`Tr2ShaderProgramALStub.cpp:35-48`, `Tr2ShaderProgramALMetal.mm:40-53`),
    // DX11 per slot. Without it a duplicate linked silently and `GetModuleFor`
    // returned whichever `find` reached first - unpredictable, and invisible
    // until a pipeline drew with the wrong stage.
    let stages = 0;
    for (const shader of shaders)
    {
      if (!shader || !shader.IsValid()) return ALResult.E_INVALIDARG;

      const bit = 1 << shader.GetType();
      if ((stages & bit) !== 0) return ALResult.E_INVALIDARG;
      stages |= bit;
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

  /**
   * Which memory class this program occupies.
   *
   * @returns {number} A `Tr2ALMemoryType` value.
   */
  GetMemoryClass()
  {
    return Tr2ALMemoryType.AL_MEMORY_MANAGED;
  }

  /**
   * Fills in a device-resource description.
   *
   * @param {object} description The description to fill.
   * @returns {object} The description, filled.
   */
  Describe(description)
  {
    if (!description) return description;

    description.memoryClass = this.GetMemoryClass();

    return description;
  }

  /**
   * Names the program for a debugger, and every stage under it.
   *
   * WebGPU has no program object to label - there is no link step - so the name
   * reaches the modules, which is where it can actually appear in an error.
   *
   * @param {string} name The name to attach.
   * @returns {number} An `ALResult` value.
   */
  SetName(name)
  {
    for (const shader of this.#shaders) shader.SetName(name);

    return ALResult.S_OK;
  }
}
