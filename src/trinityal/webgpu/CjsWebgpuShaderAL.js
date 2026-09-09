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
import { ALResult, Tr2ALMemoryType } from "#trinityal";
import { ShaderType } from "#consts/render-context";
import { readBackendBlock } from "#resource/format";


/**
 * The entry point every stage in a Carbon WebGPU container has.
 *
 * The writer refuses any other name (`buildCarbonEffectContainer.js:45-50`), so
 * a module carries no entry-point record and this is the one value it can be.
 */
export const WEBGPU_ENTRY_POINT = "main";

/**
 * WebGPU's `GPUShaderStage` bit for each stage name the backend block uses.
 *
 * Spelled out rather than read from `globalThis.GPUShaderStage` because a
 * headless test has no such global and the values are spec constants.
 */
const STAGE_VISIBILITY = Object.freeze({ vertex: 1, fragment: 2, compute: 4 });

/** A monotonic program identity, for the pipeline cache. */
let nextProgramId = 1;


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
        // Exactly one of these is present, already in GPUBindGroupLayoutEntry
        // form - the reader derives it from the WGSL type text.
        buffer: binding.buffer,
        texture: binding.texture,
        sampler: binding.sampler
      });
    }
  }

  return bindings;
}


/**
 * The layout half of a binding, the part two stages must agree on.
 *
 * @param {object} binding A stage binding.
 * @returns {string} A comparable key.
 */
function LayoutKey(binding)
{
  return JSON.stringify([
    binding.resourceKind,
    binding.registerSpace,
    binding.registerIndex,
    binding.buffer ?? null,
    binding.texture ?? null,
    binding.sampler ?? null
  ]);
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
  m_type = ShaderType.INVALID_SHADER;

  /** m_signature */
  m_signature = null;

  /** The WGSL this module was compiled from. */
  m_source = "";

  /** The compiled module, or null before Create. */
  m_module = null;

  m_webgpu = null;

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
  m_bindings = [];

  /** Carbon's `m_signature.pipelineInputs`, the vertex inputs this stage reads. */
  m_inputs = [];

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

    this.m_source = wgslFrom(bytecode);
    this.m_module = webgpu.GetDevice().createShaderModule({
      label: shaderPath || "Tr2ShaderAL",
      code: this.m_source
    });
    this.m_webgpu = webgpu;
    this.m_type = type;
    this.m_signature = signature;
    this.m_bindings = bindings;
    this.m_inputs = Array.isArray(signature?.pipelineInputs) ? signature.pipelineInputs.slice() : [];

    return ALResult.S_OK;
  }

  /** This stage's bind-group declarations. @returns {object[]} */
  GetBindings()
  {
    return this.m_bindings;
  }

  /** The vertex inputs this stage reads. @returns {object[]} */
  GetInputs()
  {
    return this.m_inputs;
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
    return this.m_module !== null && this.m_type !== ShaderType.INVALID_SHADER;
  }

  /** The stage this shader was created for. */
  GetType()
  {
    return this.m_type;
  }

  /** The WGSL this was compiled from, as bytes, matching the stub's contract. */
  GetBytecode()
  {
    return new TextEncoder().encode(this.m_source);
  }

  /** The reflected signature. */
  GetSignature()
  {
    return this.m_signature;
  }

  /** The `GPUShaderModule`, for a pipeline to reference. */
  GetModule()
  {
    return this.m_module;
  }

  /** Releases the module. */
  Destroy()
  {
    // A GPUShaderModule has no destroy(); it is released when nothing
    // references it. Dropping the reference is the whole of it.
    this.m_module = null;
    this.m_webgpu = null;
    this.m_type = ShaderType.INVALID_SHADER;
    this.m_signature = null;
    this.m_source = "";
    this.m_bindings = [];
    this.m_inputs = [];
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
    this.m_type = type;
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
    if (this.m_module) this.m_module.label = String(name);

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
 * THE PIPELINE LAYOUT IS BUILT HERE, AT CREATE, FROM THE STAGES. That is
 * DX12's shape exactly: `Tr2ShaderProgramAL::Create` walks each stage's
 * signature and merges its registers into one root signature
 * (`dx12/Tr2ShaderProgramALDx12.cpp:220-252`), and Metal's merges each stage's
 * resource mask the same way (`Tr2ShaderProgramALMetal.mm:67`). WebGPU's root
 * signature is a `GPUPipelineLayout`, and its per-stage input is the binding
 * list each `CjsWebgpuShaderAL` decoded from the block on its signature.
 *
 * This is what lets a draw resolve a pipeline from BOUND STATE: a bound program
 * carries its own layout, so nothing downstream needs the effect package the
 * program was read from. Before this the program held modules and nothing else,
 * and the layout lived only in a package the abstraction layer had no route to.
 *
 * `GetRegisterMap` is still not here; it belongs to the resource-set lane, and
 * the parity baseline records it.
 */
export class CjsWebgpuShaderProgramAL
{
  /** m_shaders, in the order given. */
  m_shaders = [];

  /**
   * A process-unique identity, which is what the pipeline cache keys on.
   *
   * Metal hashes the function POINTERS into its pipeline key
   * (`MetalWorkQueue.mm:1610-1611`); an id is the same thing in a language
   * without addresses. Zero until Create.
   */
  m_id = 0;

  /** The merged bindings, one entry per `(group, binding)` slot. */
  m_bindings = [];

  /** `GPUBindGroupLayout` per group, contiguous from group zero. */
  m_bindGroupLayouts = [];

  /** The `GPUPipelineLayout`, this backend's root signature; null until Create. */
  m_pipelineLayout = null;

  /** Metal's `m_iaInputs`: the vertex stage's pipeline inputs. */
  m_inputs = [];

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

    // MERGE BY SLOT, AS DX12 MERGES BY REGISTER. A binding two stages both
    // read appears in both stage lists; it becomes ONE layout entry visible to
    // both. Two stages claiming one slot with different layouts is a container
    // defect, refused here where the cause is rather than at pipeline creation.
    const merged = new Map();

    for (const shader of shaders)
    {
      const visibility = STAGE_VISIBILITY[WEBGPU_STAGE_NAME[shader.GetType()]] ?? 0;

      for (const binding of shader.GetBindings())
      {
        const slot = `${binding.group}:${binding.binding}`;
        const existing = merged.get(slot);

        if (existing)
        {
          if (existing.layoutKey !== LayoutKey(binding)) return ALResult.E_INVALIDARG;
          existing.visibility |= visibility;
          continue;
        }

        merged.set(slot, { ...binding, visibility, layoutKey: LayoutKey(binding) });
      }
    }

    const bindings = Array.from(merged.values())
      .sort((left, right) => left.group - right.group || left.binding - right.binding);
    const groupCount = bindings.length ? bindings[bindings.length - 1].group + 1 : 0;

    // THE DEVICE OBJECTS ARE MADE HERE, as DX12 serialises and creates its root
    // signature inside Create (`:262-289`). An absent group index gets an
    // empty layout: WebGPU pipeline layouts are positional.
    const webgpu = renderContext.GetWebgpu();
    if (!webgpu) return ALResult.E_INVALIDCALL;

    const device = webgpu.GetDevice();

    const bindGroupLayouts = [];

    for (let group = 0; group < groupCount; group += 1)
    {
      bindGroupLayouts.push(device.createBindGroupLayout({
        label: `Tr2ShaderProgramAL.group${group}`,
        entries: bindings
          .filter(binding => binding.group === group)
          .map(binding => ({
            binding: binding.binding,
            visibility: binding.visibility,
            // A UNIFORM SLOT IS DYNAMIC, by the backend's decision and not the
            // container's. Constant buffers are bound out of a per-frame arena
            // at (page, offset), as Metal's are (`MetalWorkQueue.mm:2656-2659`,
            // `setVertexBufferOffset:`), and WebGPU spells a per-draw offset as
            // a dynamic offset on the layout. The container's `hasDynamicOffset`
            // is not consulted: it describes nothing the AL does not decide.
            ...(binding.buffer
              ? { buffer: binding.buffer.type === "uniform" ? { ...binding.buffer, hasDynamicOffset: true } : binding.buffer }
              : {}),
            ...(binding.texture ? { texture: binding.texture } : {}),
            ...(binding.sampler ? { sampler: binding.sampler } : {})
          }))
      }));
    }

    this.m_pipelineLayout = device.createPipelineLayout({
      label: "Tr2ShaderProgramAL.layout",
      bindGroupLayouts
    });
    this.m_bindGroupLayouts = bindGroupLayouts;
    this.m_bindings = bindings;
    this.m_shaders = shaders.slice();
    this.m_inputs = shaders
      .find(shader => shader.GetType() === ShaderType.VERTEX_SHADER)
      ?.GetInputs() ?? [];
    this.m_id = nextProgramId;
    nextProgramId += 1;

    return ALResult.S_OK;
  }

  /** Whether the program linked. */
  IsValid()
  {
    return this.m_shaders.length > 0;
  }

  /**
   * The identity a pipeline cache keys this program under.
   *
   * @returns {string|null} A stable string, or null before Create.
   */
  GetIdentity()
  {
    return this.m_id ? `program:${this.m_id}` : null;
  }

  /** The merged bind-group declarations, sorted by group then binding. */
  GetBindings()
  {
    return this.m_bindings;
  }

  /** Metal's `GetInputs`: the vertex stage's pipeline inputs. */
  GetInputs()
  {
    return this.m_inputs;
  }

  /** One `GPUBindGroupLayout` per group, contiguous from zero. */
  GetBindGroupLayouts()
  {
    return this.m_bindGroupLayouts;
  }

  /** The `GPUPipelineLayout` a pipeline built from this program takes. */
  GetPipelineLayout()
  {
    return this.m_pipelineLayout;
  }

  /** The linked shaders, in the order they were given. */
  GetShaders()
  {
    return this.m_shaders;
  }

  /**
   * The module for one stage, or null when the program has no such stage.
   *
   * @param {*} type The stage to find.
   * @returns {GPUShaderModule|null} Its module.
   */
  GetModuleFor(type)
  {
    const shader = this.m_shaders.find(candidate => candidate.GetType() === type);

    return shader ? shader.GetModule() : null;
  }

  /** Releases the linked shaders and the layout built from them. */
  Destroy()
  {
    // Layout objects have no destroy(); dropping the references releases them.
    this.m_shaders = [];
    this.m_bindings = [];
    this.m_bindGroupLayouts = [];
    this.m_pipelineLayout = null;
    this.m_inputs = [];
    this.m_id = 0;
  }

  /**
   * Builds D3D12 indirect-command signatures.
   *
   * REFUSES, WHICH IS CARBON'S OWN NON-DX12 ANSWER rather than an omission.
   * The shared facade defines it for every other backend as `return E_FAIL`
   * (`src/Tr2ShaderProgramAL.cpp:34-42`), so the method is on the contract
   * everywhere and only its implementation is DX12's.
   *
   * It was recorded as an accepted divergence on the grounds that it is
   * "DX12-only". That was a misreading: leaving it out produces a TypeError at
   * the call site, which is the defect class this backend's surface work was
   * written to remove.
   *
   * @param {object} _bufferLayout A `Tr2IndirectBufferLayoutAL`.
   * @param {object} _renderContext The primary render context.
   * @returns {boolean} False.
   */
  CreateCommandSignatures(_bufferLayout, _renderContext)
  {
    return false;
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
    for (const shader of this.m_shaders) shader.SetName(name);

    return ALResult.S_OK;
  }
}
