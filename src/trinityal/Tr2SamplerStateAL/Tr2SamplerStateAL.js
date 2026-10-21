// Source: trinity/trinityal/include/Tr2SamplerStateAL.h
// Source: trinity/trinityal/src/Tr2SamplerStateAL.cpp
//
// The backend-neutral sampler state: Carbon's PIMPL value. An owner holds one
// BY VALUE (`Tr2SamplerOverrideData::sampler`, `Shader/Tr2Material.h:33`;
// `Tr2ResourceSetDescriptionAL::Sampler::sampler`, `Tr2ResourceSetAL.h:116`),
// it is invalid until `Create` fills it, and the backends read the shared
// implementation behind it (`desc.sampler.m_sampler->m_samplerState`,
// `Tr2ResourceSetALDx11.cpp:78`).
//
// `Create` IS A FACTORY LOOKUP (`Tr2SamplerStateAL.cpp:25-28`): the primary
// context's `Tr2SamplerStateALFactory` (`Tr2ObjectFactory.h`) keeps one
// implementation per distinct description and hands every handle that asks a
// share of it, which is why a resource set can compare samplers by identity.
// Ours is the render context's `CreateSamplerState(description, true)`, for the
// reason the context allocates every AL implementation: it is the one place the
// backend is known.
import { CjsSchema, meta, blue, type } from "#schema";
import { Tr2ALMemoryType } from "#consts/graphics";
import { ALResult, Failed } from "../ALResult.js";
import { RenderContextALOf } from "../renderContextAL.js";


/** Carbon's "no descriptor heap index". */
const NO_HEAP_INDEX = 0xffffffff;

/**
 * Carbon's file-scope `nullSampler` (`Tr2SamplerStateAL.cpp:10`): the shared
 * default implementation every uncreated handle points at. Carbon's is the
 * platform impl default-constructed; the handle here is backend-neutral, so
 * this answers as every backend's default-constructed impl does - invalid, no
 * heap index, managed memory (`Tr2SamplerStateALStub.cpp:10-35`).
 */
const nullSampler = {
  IsValid: () => false,
  GetIndexInHeap: () => NO_HEAP_INDEX,
  GetMemoryClass: () => Tr2ALMemoryType.AL_MEMORY_MANAGED,
  SetName: () => ALResult.E_INVALIDCALL
};


/** A sampler state value sharing one factory-owned backend implementation. */
export class Tr2SamplerStateAL
{
  /** m_sampler: the shared implementation; `nullSampler` until created. */
  _sampler = nullSampler;

  /**
   * Carbon's default constructor (`Tr2SamplerStateAL.cpp:20-23`) leaves the
   * value on `nullSampler`. A `copy` replaces C++'s implicit copy construction,
   * sharing the implementation; plain JavaScript assignment aliases instead.
   *
   * @param {object} [options] Copy construction.
   * @param {Tr2SamplerStateAL|null} [options.copy] The value to share.
   */
  constructor({ copy = null } = {})
  {
    if (copy) this._sampler = copy._sampler;
  }

  /**
   * Carbon's Create( description, renderContext ) (`Tr2SamplerStateAL.h:21`,
   * `Tr2SamplerStateAL.cpp:25-28`): the context's factory hands back the
   * shared implementation for the description, creating it on a miss. A
   * refused create leaves this value as it was, as `Tr2ObjectFactory::Get`
   * returns before assigning.
   *
   * Adapted: the render context's `CreateSamplerState(description, true)`
   * stands in for `renderContext.m_samplerStateFactory.Get`, because the
   * context is where JavaScript selects the backend.
   *
   * @param {object} description A `Tr2SamplerDescription`.
   * @param {object} renderContext The context whose factory answers.
   * @returns {number} An `ALResult` value.
   */
  @blue.method
  @meta.adapted
  Create(description, renderContext)
  {
    const { result, implementation } = RenderContextALOf(renderContext).CreateSamplerState(description, true);
    if (Failed(result)) return result;

    this._sampler = implementation;
    return result;
  }

  /**
   * Where the sampler sits in the descriptor heap (`Tr2SamplerStateAL.cpp:30-33`).
   *
   * @returns {number} The index, or Carbon's "no index".
   */
  @blue.method
  @meta.implemented
  GetIndexInHeap()
  {
    return this._sampler.GetIndexInHeap();
  }

  /**
   * Whether the implementation exists on the device (`Tr2SamplerStateAL.cpp:35-38`).
   *
   * @returns {boolean} True once created.
   */
  @blue.method
  @meta.implemented
  IsValid()
  {
    return this._sampler.IsValid();
  }

  /**
   * The implementation's memory class (`Tr2SamplerStateAL.cpp:40-43`).
   *
   * @returns {number} A `Tr2ALMemoryType` value.
   */
  @blue.method
  @meta.implemented
  GetMemoryClass()
  {
    return this._sampler.GetMemoryClass();
  }

  /**
   * Compares implementation identity (`Tr2SamplerStateAL.cpp:45-48`).
   *
   * Adapted: JavaScript has no overloadable equality operator.
   *
   * @param {Tr2SamplerStateAL} other The value to compare.
   * @returns {boolean} Whether both share one implementation.
   */
  @blue.method
  @meta.adapted
  Equals(other)
  {
    return this._sampler === other._sampler;
  }

  /**
   * The shared backend implementation, for the resource set that binds it
   * (`Tr2SamplerStateAL.cpp:50-53`); `nullSampler` when uncreated.
   *
   * @returns {object} The implementation.
   */
  @blue.method
  @meta.implemented
  TrinityALImpl_GetObject()
  {
    return this._sampler;
  }

  /**
   * Names valid storage; an invalid value or an absent name keeps Carbon's
   * errors (`Tr2SamplerStateAL.cpp:55-66`).
   *
   * @param {string} name The name.
   * @returns {number} An `ALResult` value.
   */
  @blue.method
  @meta.implemented
  SetName(name)
  {
    if (!this.IsValid()) return ALResult.E_INVALIDCALL;
    if (name === null || name === undefined) return ALResult.E_INVALIDARG;
    return this._sampler.SetName(name);
  }

  /**
   * Resets this value to `nullSampler`, Carbon's `m_sampler = Tr2SamplerStateAL()`.
   *
   * Ours (no blue stamp): JavaScript has no scope destructor. The implementation is not
   * destroyed here: the context's factory holds it until the factory is
   * cleared, as Carbon's factory map holds its shared_ptr.
   */
  Destroy()
  {
    this._sampler = nullSampler;
  }
}

CjsSchema.decorateField(Tr2SamplerStateAL, "_sampler", type.unknown);
CjsSchema.decorateMethod(Tr2SamplerStateAL, "Equals", meta.renamed("operator=="));
CjsSchema.meta.carbon("Tr2SamplerStateAL")(Tr2SamplerStateAL);
