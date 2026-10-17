// Source: trinity/trinityal/include/Tr2ShaderAL.h
//   trinity/trinityal/stub/Tr2ShaderALStub.cpp
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
//
// FIELDS ARE PUBLIC AND CARBON-NAMED, not private. Carbon's AL facade holds
// exactly one private member - the `shared_ptr` to its impl - and the impl
// class behind it carries public state, which is why Metal reads
// `buffer.m_buffer->GetMetalBuffer()` and the stub swap chain declares
// `m_backBuffer` public. We merge facade and impl into one class, so the merged
// class carries the impl's fields.
//
// The whole layer is internal, so hiding inside it buys nothing - and it cost
// something real: a program whose state was entirely private has no own
// enumerable keys, canonicalised to an empty object, and would have collided
// with every other program in the pipeline cache.
import { CjsSchema, blue } from "#schema";
import { Tr2ALMemoryType } from "#consts/graphics";
import { ALResult } from "#trinityal";
import { ShaderType } from "#consts/render-context";
import { CARBON_BACKEND_COVERAGE_DISCARD_OVERRIDE, CARBON_BACKEND_UNORM_TARGET_OVERRIDE, readBackendBlock } from "#resource/format";

/**
 * The entry point every stage in a Carbon WebGPU container has.
 *
 * The writer refuses any other name (`buildCarbonEffectContainer.js:45-50`), so
 * a module carries no entry-point record and this is the one value it can be.
 */
export const WEBGPU_ENTRY_POINT = "main";

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
 * The colour locations a fragment stage writes, from its WGSL: the
 * `@location(N)` members of the `FragmentOutput` struct our lowering emits
 * (`SV_TargetN` -> `@location(N)`). D3D keeps the same fact in the pixel
 * shader's OSGN; the WGSL is what this stage already holds.
 *
 * @param {string} source The stage's WGSL.
 * @returns {number[]} The written locations, ascending.
 */
function FragmentOutputLocations(source)
{
  const struct = /struct\s+FragmentOutput\s*\{([^}]*)\}/u.exec(source);

  if (struct) return Array.from(struct[1].matchAll(/@location\((\d+)\)/gu), match => Number(match[1])).sort((a, b) => a - b);

  // A hand-written stage may return its one output directly: `-> @location(0) vec4f`.
  const direct = /@fragment[^{]*->\s*@location\((\d+)\)/u.exec(source);

  return direct ? [ Number(direct[1]) ] : [];
}

/**
 * The colour locations whose UNORM override a fragment stage declares
 * (CARBON_BACKEND_UNORM_TARGET_OVERRIDE). A pipeline may set only overrides
 * the module declares, so a hand-written stage without them gets none.
 *
 * @param {string} source The stage's WGSL.
 * @returns {number[]} The locations, ascending.
 */
function UnormTargetOverrides(source)
{
  const pattern = new RegExp(`override\\s+${CARBON_BACKEND_UNORM_TARGET_OVERRIDE}(\\d+)\\s*:`, "gu");

  return Array.from(source.matchAll(pattern), match => Number(match[1])).sort((a, b) => a - b);
}

/**
 * The bind-group declarations visible to one stage, decoded from the block on
 * its signature.
 *
 * @param {number} type A Carbon `ShaderType`.
 * @param {object|null} signature The stage's signature.
 * @returns {object[]|null} The stage's bindings; an empty list when the
 *   signature carries no block; null when the block is not this backend's.
 */
function StageBindings(type, signature)
{
  const block = signature?.backendBlock;

  if (!block || !block.size || !block.bytes) return [];

  const stageName = WEBGPU_STAGE_NAME[type];
  let decoded;

  try
  {
    decoded = readBackendBlock(block.bytes, { source: "Tr2ShaderSignatureAL.backendBlock" });
  }
  catch
  {
    return null;
  }

  const bindings = [];

  for (const group of decoded.bindGroups)
  {
    for (const binding of group.bindings)
    {
      if (!binding.visibility.includes(stageName)) continue;

      bindings.push({
        group: group.group,
        binding: binding.binding,
        identity: binding.identity,
        scopeIdentity: binding.scopeIdentity,
        resourceKind: binding.resourceKind,
        registerIndex: binding.registerIndex,
        registerSpace: binding.registerSpace,
        // The backend tells a binding it fills itself by its symbol: the
        // emulated-addressing modes buffer (CARBON_BACKEND_ADDRESS_MODES_SYMBOL).
        generatedSymbol: binding.generatedSymbol,
        // Exactly one of these is present, already in GPUBindGroupLayoutEntry
        // form - the reader derives it from the WGSL type text.
        buffer: binding.buffer,
        texture: binding.texture,
        storageTexture: binding.storageTexture,
        sampler: binding.sampler
      });
    }
  }

  return bindings;
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
  _type = ShaderType.INVALID_SHADER;

  /** m_signature */
  _signature = null;

  /** The WGSL this module was compiled from. */
  _source = "";

  /** The compiled module, or null before Create. */
  _module = null;

  /** The colour locations a pixel stage writes (FragmentOutputLocations). */
  _outputs = [];

  /** The colour locations whose UNORM override the stage declares. */
  _unormOverrides = [];

  _webgpu = null;

  /**
   * This stage's bind-group declarations, from the pass's backend block.
   *
   * METAL'S `m_resourceMask`, IN THIS BACKEND'S VOCABULARY. Metal derives a
   * per-stage binding table from `signature.registers` at Create
   * (`Tr2ShaderALMetal.mm:37-217`) and the program merges the stages' tables
   * (`Tr2ShaderProgramALMetal.mm:67`). A WGSL pipeline needs `(group, binding,
   * layout)` rather than a register mask, and Carbon's registers cannot say
   * that - so the container's per-pass block does, and it arrives here on the
   * signature. Only the bindings visible to THIS stage are kept: a stage's
   * table describes its own bindings, which is what lets two passes share an
   * identical vertex stage.
   */
  _bindings = [];

  /** Carbon's `m_signature.pipelineInputs`, the vertex inputs this stage reads. */
  _inputs = [];

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

    // REFUSED BEFORE COMPILING, AS METAL REFUSES A SIGNATURE IT CANNOT HONOUR
    // (`Tr2ShaderALMetal.mm:24-27`). A block that is not this backend's - a
    // WebGL2 container routed here - would otherwise compile a module whose
    // bindings nothing can lay out, and fail later with a message about the
    // pipeline.
    const bindings = StageBindings(type, signature);
    if (bindings === null) return ALResult.E_INVALIDARG;

    this._source = wgslFrom(bytecode);
    this._module = webgpu.GetDevice().createShaderModule({
      label: shaderPath || "Tr2ShaderAL",
      code: this._source
    });
    this._webgpu = webgpu;
    this._type = type;
    this._signature = signature;
    this._bindings = bindings;
    this._inputs = Array.isArray(signature?.pipelineInputs) ? signature.pipelineInputs.slice() : [];
    this._outputs = type === ShaderType.PIXEL_SHADER ? FragmentOutputLocations(this._source) : [];
    this._unormOverrides = type === ShaderType.PIXEL_SHADER ? UnormTargetOverrides(this._source) : [];
    this._coverageDiscard = type === ShaderType.PIXEL_SHADER
      && new RegExp(`override\\s+${CARBON_BACKEND_COVERAGE_DISCARD_OVERRIDE}\\s*:`, "u").test(this._source);

    return ALResult.S_OK;
  }

  /**
   * The colour locations whose UNORM override a pixel stage declares; empty
   * for any other stage, and for a hand-written one without them.
   *
   * @returns {number[]} The locations, ascending.
   */
  GetUnormTargetOverrides()
  {
    return this._unormOverrides;
  }

  /**
   * Whether a pixel stage declares the coverage-discard override
   * (CARBON_BACKEND_COVERAGE_DISCARD_OVERRIDE); a pipeline may set only what
   * the module declares.
   *
   * @returns {boolean} True when declared.
   */
  HasCoverageDiscardOverride()
  {
    return this._coverageDiscard === true;
  }

  /**
   * The colour locations a pixel stage writes; empty for any other stage.
   *
   * @returns {number[]} The written locations, ascending.
   */
  GetOutputs()
  {
    return this._outputs;
  }

  /** This stage's bind-group declarations. @returns {object[]} */
  GetBindings()
  {
    return this._bindings;
  }

  /** The vertex inputs this stage reads. @returns {object[]} */
  GetInputs()
  {
    return this._inputs;
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
    return this._module !== null && this._type !== ShaderType.INVALID_SHADER;
  }

  /** The stage this shader was created for. */
  GetType()
  {
    return this._type;
  }

  /** The WGSL this was compiled from, as bytes, matching the stub's contract. */
  GetBytecode()
  {
    return new TextEncoder().encode(this._source);
  }

  /** The reflected signature. */
  GetSignature()
  {
    return this._signature;
  }

  /** The `GPUShaderModule`, for a pipeline to reference. */
  GetModule()
  {
    return this._module;
  }

  /** Releases the module. */
  Destroy()
  {
    // A GPUShaderModule has no destroy(); it is released when nothing
    // references it. Dropping the reference is the whole of it.
    this._module = null;
    this._webgpu = null;
    this._type = ShaderType.INVALID_SHADER;
    this._signature = null;
    this._source = "";
    this._bindings = [];
    this._inputs = [];
    this._outputs = [];
    this._unormOverrides = [];
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
    if (this._module) this._module.label = String(name);

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
CjsSchema.decorateMethod(CjsWebgpuShaderAL, "Create", blue.method);
CjsSchema.decorateMethod(CjsWebgpuShaderAL, "IsValid", blue.method);
CjsSchema.decorateMethod(CjsWebgpuShaderAL, "GetType", blue.method);
CjsSchema.decorateMethod(CjsWebgpuShaderAL, "GetBytecode", blue.method);
CjsSchema.decorateMethod(CjsWebgpuShaderAL, "GetSignature", blue.method);
CjsSchema.decorateMethod(CjsWebgpuShaderAL, "Destroy", blue.method);
CjsSchema.decorateMethod(CjsWebgpuShaderAL, "SetNullShaderType", blue.method);
CjsSchema.decorateMethod(CjsWebgpuShaderAL, "GetMemoryClass", blue.method);
CjsSchema.decorateMethod(CjsWebgpuShaderAL, "Describe", blue.method);
CjsSchema.decorateMethod(CjsWebgpuShaderAL, "SetName", blue.method);
CjsSchema.blue.define(CjsWebgpuShaderAL, { className: "CjsWebgpuShaderAL", donors: [ "Tr2ShaderAL" ] });
