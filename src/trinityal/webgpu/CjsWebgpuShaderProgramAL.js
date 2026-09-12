// Source: trinity/trinityal/include/Tr2ShaderProgramAL.h
//
// The linked-program half of Carbon's shader pair. The rationale shared with
// its partner - why these exist at all, why bytecode here is WGSL text rather
// than DXBC, and why fields are public and Carbon-named - is recorded in the
// head comment of CjsWebgpuShaderAL.js, which several other files already cite.
import { CjsSchema } from "#schema";
import { ALResult, Tr2ALMemoryType, Tr2RegisterMapAL } from "#trinityal";
import { ShaderType } from "#consts/render-context";
import { WEBGPU_STAGE_NAME } from "./CjsWebgpuShaderAL.js";

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
 * Register maps retain signature order before physical WebGPU bindings merge.
 */
export class CjsWebgpuShaderProgramAL
{
  /** m_shaders, in the order given. */
  m_shaders = [];

  m_registerMap = new Tr2RegisterMapAL();

  /** Returns the dense register map built from the linked shader signatures. */
  GetRegisterMap()
  {
    return this.m_registerMap;
  }

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
    this.m_registerMap = new Tr2RegisterMapAL({ shaders });
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
    this.m_registerMap = new Tr2RegisterMapAL();
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

// DECLARED AS A CALL, NOT A DECORATOR, for the reason recorded in
// Tr2BitmapDimensions.js: the layer is imported straight from source by its
// tests and raw Node cannot parse decorator syntax.
//
// The donor is NAMED rather than left to be derived from this class's name.
// Carbon calls every backend's class the same thing and carries the backend in
// the FILE name, because only one backend compiles at a time; we ship them
// together, so the backend moves onto the class name. That divergence is the
// author's to declare, never a checker's to guess.
CjsSchema.define(CjsWebgpuShaderProgramAL, { className: "CjsWebgpuShaderProgramAL", carbon: "Tr2ShaderProgramAL" });
