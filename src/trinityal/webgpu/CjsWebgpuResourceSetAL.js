// Source: trinity/trinityal/include/Tr2ResourceSetAL.h
//   trinity/trinityal/metal/Tr2ResourceSetALMetal.mm
//   trinity/trinityal/dx12/Tr2ResourceSetALDx12.cpp
//
// A `Tr2ResourceSetAL` for WebGPU: the description's textures, samplers and
// buffers resolved against the program's bindings, ready to become bind groups.
//
// WHAT IT HOLDS AND WHAT IT DOES NOT. Carbon's description carries SRVs, UAVs
// and samplers; constant buffers are NOT in it (`Tr2ResourceSetAL.h:57-65` has
// no `SetConstantBuffer`) - they travel `SetConstants` and are bound beside the
// set at the draw (DX12 root CBVs via `m_cbRegisters`, Metal's const-buffer
// offset region). So this resolves every non-uniform slot of the program's
// layout at Create, as Metal's `Create` fills its per-stage native arrays
// (`Tr2ResourceSetALMetal.mm:57-279`), and the render context assembles each
// `GPUBindGroup` from these entries plus the bound constant buffers when it
// draws - a bind group being immutable, it can only exist once both halves are
// known.
//
// UNFILLED SLOTS GET DUMMIES, AS METAL'S DO. Metal seeds its masks from the
// program's requirements and fills what the description left empty with
// `GetDummyTexture` / `GetDummySampler` (`:240-265`); DX12 substitutes null
// views (`Tr2ResourceSetALDx12.cpp:145-146`). A WebGPU bind group with a hole
// is a validation error, so the same substitution happens here.
//
// A TEXTURE THAT IS NOT YET A DEVICE TEXTURE GETS THE DUMMY TOO. The
// description's SRV is whatever `TriTextureParameter` bound - today a
// `TriTextureRes`, not a `Tr2TextureAL` (Carbon's `TriTextureRes::GetTexture()`
// returns one). Until that port lands, a texture without `GetDeviceTextureView`
// is treated as Carbon treats a resource still loading: the fallback texture.
import { ALResult, Tr2ALMemoryType } from "#trinityal";
import { ShaderType } from "#consts/render-context";

/** GPUShaderStage bits to the Carbon stage whose description slot answers. */
const STAGE_OF_VISIBILITY = Object.freeze([
  [ 1, ShaderType.VERTEX_SHADER ],
  [ 2, ShaderType.PIXEL_SHADER ],
  [ 4, ShaderType.COMPUTE_SHADER ]
]);

let nextResourceSetId = 1;


/**
 * The description slot a binding reads, trying each stage it is visible to.
 *
 * A binding two stages share was merged by the container because both read
 * the same register; whichever stage the material filled answers.
 */
function SlotFor(description, kind, binding)
{
  for (const [ bit, stage ] of STAGE_OF_VISIBILITY)
  {
    if ((binding.visibility & bit) === 0) continue;

    const slot = description.Get(kind, stage, binding.registerIndex);

    if (slot) return slot;
  }

  return null;
}


/**
 * A `Tr2ResourceSetAL` holding the resolved bindings a draw's bind groups are
 * assembled from.
 */
export class CjsWebgpuResourceSetAL
{
  /** A process-unique identity, for the context's bind-group cache. Zero until Create. */
  m_id = 0;

  m_description = null;

  m_program = null;

  /** `"group:binding"` to the `GPUBindingResource` that fills it, non-uniform slots only. */
  m_entries = new Map();

  /**
   * Resolves the description against the program.
   *
   * @param {object} description A `Tr2ResourceSetDescriptionAL`.
   * @param {object} program The `CjsWebgpuShaderProgramAL` this set binds against.
   * @param {object} renderContext The WebGPU render context AL.
   * @returns {number} An `ALResult` value.
   */
  Create(description, program, renderContext)
  {
    this.Destroy();

    if (!renderContext || !renderContext.IsValid()) return ALResult.E_INVALIDARG;
    if (!description || typeof description.Get !== "function") return ALResult.E_INVALIDARG;

    // DX12 refuses a description whose register map is not the program's
    // (`Tr2ResourceSetALDx12.cpp:78-81`); a program this backend did not link
    // has no bindings to lay out against, which is the same refusal.
    if (!program || typeof program.GetBindings !== "function" || !program.IsValid()) return ALResult.E_INVALIDARG;

    const entries = new Map();

    for (const binding of program.GetBindings())
    {
      // Constant buffers are not the set's; see the head note.
      if (binding.buffer && binding.buffer.type === "uniform") continue;

      entries.set(`${binding.group}:${binding.binding}`, this._Resolve(description, binding, renderContext));
    }

    this.m_entries = entries;
    this.m_description = description;
    this.m_program = program;
    this.m_id = nextResourceSetId;
    nextResourceSetId += 1;

    return ALResult.S_OK;
  }

  /** One slot's resource, or the dummy Metal would put there. */
  _Resolve(description, binding, renderContext)
  {
    if (binding.sampler)
    {
      const slot = SlotFor(description, "sampler", binding);
      const state = slot ? slot.sampler : null;
      const sampler = state && typeof state.GetSampler === "function" ? state.GetSampler() : null;

      return sampler ?? renderContext.GetDummySampler();
    }

    if (binding.texture)
    {
      const slot = SlotFor(description, "srv", binding);
      const texture = slot ? slot.resource : null;
      const dimension = binding.texture.viewDimension ?? "2d";
      const view = texture && typeof texture.GetDeviceTextureView === "function"
        ? texture.GetDeviceTextureView(dimension, slot.colorSpace)
        : null;

      return view ?? renderContext.GetDummyTexture(dimension);
    }

    // A storage buffer: read-only ones are SRVs, writable ones UAVs.
    const kind = binding.buffer && binding.buffer.type === "storage" ? "uav" : "srv";
    const slot = SlotFor(description, kind, binding);
    const resource = slot ? slot.resource : null;
    const buffer = resource && typeof resource.GetDeviceBuffer === "function" ? resource.GetDeviceBuffer() : null;

    return { buffer: buffer ?? renderContext.GetNullBuffer(binding.buffer?.minBindingSize ?? 16, "STORAGE") };
  }

  /** The resolved entries by `"group:binding"`. @returns {Map<string, object>} */
  GetEntries()
  {
    return this.m_entries;
  }

  /** The `Tr2ResourceSetDescriptionAL` it was created from, or null. */
  GetDescription()
  {
    return this.m_description;
  }

  /** The shader program whose bindings were resolved, or null. */
  GetProgram()
  {
    return this.m_program;
  }

  /** Whether the set has been created and carries an identity. */
  IsValid()
  {
    return this.m_id !== 0;
  }

  /** Drops the resolved entries, leaving the set invalid. */
  Destroy()
  {
    this.m_entries = new Map();
    this.m_description = null;
    this.m_program = null;
    this.m_id = 0;
  }

  /** Where the set lives, which is managed memory rather than the device. */
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
   * Nothing here carries a label - the bind groups the context builds do.
   *
   * @returns {number} `S_OK`.
   */
  SetName(_name)
  {
    return ALResult.S_OK;
  }
}
