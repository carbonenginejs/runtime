// Source: trinity/trinityal/include/Tr2SamplerStateAL.h
//   trinity/trinityal/metal/Tr2SamplerStateALMetal.mm
//   trinity/trinityal/stub/Tr2SamplerStateALStub.cpp
//
// A `Tr2SamplerStateAL` holding a real `GPUSampler`.
//
// CREATED THROUGH THE CONTEXT'S FACTORY, NOT DIRECTLY. Carbon's
// `Tr2SamplerStateAL::Create` is a cache lookup on the primary context
// (`Tr2SamplerStateAL.cpp:25-28`), keyed on the description, so that two
// samplers authored alike are one driver object and a resource set's
// change-detect can compare states by identity. `CjsWebgpuRenderContextAL.CreateSamplerState`
// is that factory; constructing this class directly bypasses the cache and is
// what a test does, not a caller.
//
// BORDER AND MIRROR-ONCE ARE NOT HERE. `GPUSamplerDescriptor` has three address
// modes and no border colour, so `CarbonSamplerDescriptor` folds modes 4 and 5
// to clamp-to-edge and the shader emulates them from a modes buffer the
// material fills (see the handover's emulation section). The description this
// state keeps is the AUTHORED one, border included, so the material can read
// the real modes back.
import { ALResult, Tr2ALMemoryType } from "#trinityal";
import { NormalizeSamplerDescription } from "../Tr2SamplerDescription.js";
import { CarbonSamplerDescriptor } from "./core/samplerDescriptor.js";

/** Carbon's "no descriptor heap index", as the stub spells it. */
const NO_HEAP_INDEX = 0xffffffff;


export class CjsWebgpuSamplerStateAL
{
  /** The `GPUSampler`, or null before Create. */
  m_sampler = null;

  /** The authored description, normalised; what `GetDescription` answers. */
  m_description = null;

  /** The `GPUSamplerDescriptor` the sampler was created from. */
  m_descriptor = null;

  /**
   * Creates the sampler.
   *
   * @param {object} description A `Tr2SamplerDescription`, either spelling.
   * @param {object} renderContext The WebGPU render context AL.
   * @returns {number} An `ALResult` value.
   */
  Create(description, renderContext)
  {
    this.Destroy();

    if (!renderContext || !renderContext.IsValid()) return ALResult.E_INVALIDARG;

    const normalized = NormalizeSamplerDescription(description);
    if (!normalized) return ALResult.E_INVALIDARG;

    const webgpu = renderContext.GetWebgpu();
    if (!webgpu) return ALResult.E_INVALIDCALL;

    let descriptor;

    try
    {
      descriptor = CarbonSamplerDescriptor(normalized, "Tr2SamplerStateAL");
    }
    catch
    {
      // A mode or filter Carbon's enum does not have; refused where the
      // cause is, as Metal refuses a signature it cannot honour.
      return ALResult.E_INVALIDARG;
    }

    this.m_sampler = webgpu.GetDevice().createSampler(descriptor);
    this.m_description = normalized;
    this.m_descriptor = descriptor;

    return ALResult.S_OK;
  }

  /**
   * The `GPUSampler`, for a bind group.
   *
   * Metal's `GetMetalSamplerState` under this backend's name for its native
   * object, as `GetDeviceBuffer` is for `GetMetalBuffer`.
   *
   * @returns {object|null} The sampler.
   */
  GetSampler()
  {
    return this.m_sampler;
  }

  /** The authored description, normalised. @returns {object|null} */
  GetDescription()
  {
    return this.m_description;
  }

  IsValid()
  {
    return this.m_sampler !== null;
  }

  /** No descriptor heap here, as the stub answers. */
  GetIndexInHeap()
  {
    return NO_HEAP_INDEX;
  }

  Destroy()
  {
    // A GPUSampler has no destroy(); dropping the reference releases it.
    this.m_sampler = null;
    this.m_description = null;
    this.m_descriptor = null;
  }

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
   * @param {string} name The label.
   * @returns {number} `S_OK`.
   */
  SetName(name)
  {
    if (this.m_sampler) this.m_sampler.label = String(name);

    return ALResult.S_OK;
  }
}
