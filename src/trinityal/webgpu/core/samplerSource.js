// An effect's declared sampler to a realized WebGPU sampler.
//
// The mirror of CjsWebgpuTextureSource, and much shorter, because a sampler
// needs nothing loaded. Its state is authored INTO the effect container and
// arrives on the binding record itself, so resolution is synchronous and has no
// resource path, no network and no first-frame absence.
//
// The one thing worth knowing is what a sampler is NOT: it is not paired with a
// texture here. Carbon shares samplers across textures and stores the t#/s#
// pairing only in the DXBC operands - quadv5 binds nine textures against a
// single s0 - so a source that tried to hand out one sampler per texture would
// be inventing a relationship the container does not express. See
// /docs/contracts/texture-sampler-pairing.md.
import { CarbonSamplerDescriptor } from "./samplerDescriptor.js";


function fail(message)
{
  const error = new Error(`CjsWebgpuSamplerSource: ${message}`);
  error.code = "CJS_WEBGPU_SAMPLER_SOURCE_INVALID";
  throw error;
}


/** Resolves an effect's declared samplers against one device. */
export class CjsWebgpuSamplerSource
{
  #webgpu;

  /** Descriptor cache key to the in-flight or settled sampler. */
  #created = new Map();

  /**
   * @param {object} webgpu Canonical WebGPU device.
   */
  constructor(webgpu)
  {
    if (!webgpu) fail("a WebGPU device is required");

    this.#webgpu = webgpu;
  }

  /**
   * The sampler for one declared binding.
   *
   * Keyed on the translated descriptor rather than on the binding's name,
   * because the name is scoped to one pass while the state is not: every pass
   * authoring the same state wants the same sampler, and s0 in two effects is
   * two different bindings that may well be one sampler.
   *
   * @param {string} name Binding name, for diagnostics.
   * @param {object} material Trinity material, unused; kept for the hook shape.
   * @param {object} binding Declared binding record carrying the authored state.
   * @returns {Promise<object>} Realized sampler handle.
   */
  async Resolve(name, material, binding)
  {
    const authored = binding?.carbon?.sampler;

    if (!authored)
    {
      fail(`sampler binding "${name}" carries no authored state, so there is nothing to translate`);
    }

    // Keyed BEFORE the label is attached. The label carries the binding name,
    // so keying on it would give two names with identical state two samplers,
    // which is the sharing this cache exists to do.
    const descriptor = CarbonSamplerDescriptor(authored);
    const key = JSON.stringify(descriptor);
    const existing = this.#created.get(key);

    if (existing) return existing;

    const created = this.#webgpu.CreateSampler({ ...descriptor, label: `effect sampler ${name}` });

    this.#created.set(key, created);

    return created;
  }

  /**
   * A resolver hook bound to this source.
   *
   * @returns {Function} `(name, material, binding) => Promise<object>`
   */
  ResolveSampler()
  {
    return (name, material, binding) => this.Resolve(name, material, binding);
  }

  /** Forgets every sampler, so a device loss can rebuild them. */
  Clear()
  {
    this.#created.clear();
  }
}
