// Source: trinity/trinityal/include/Tr2ResourceSetAL.h:129
// Source: trinity/trinityal/src/Tr2ResourceSetAL.cpp:547-607
import { impl } from "#schema";
import { ALResult, Failed } from "../ALResult.js";
import { Tr2ALMemoryType } from "../Tr2DeviceResourceAL.js";

// A shared ownership record substitutes for shared_ptr's control block.
// Finalization follows GC, not C++ scope exit. Device-resource teardown can
// still destroy registered stubs immediately; their later Destroy is harmless.
const release = new FinalizationRegistry(implementation => implementation.Destroy());
const nullRS = {
  implementation: {
    IsValid: () => false,
    GetMemoryClass: () => Tr2ALMemoryType.AL_MEMORY_MANAGED
  }
};

/** Public handle; implementation selection belongs to the creating context. */
export class Tr2ResourceSetAL
{
  m_resourceSet = nullRS;

  /** JS copy construction retains the shared ownership record. */
  constructor({ copy = null } = {})
  {
    if (copy) this.m_resourceSet = copy.m_resourceSet;
  }

  /**
   * Creates a backend-selected resource set and replaces this handle's shared
   * ownership record.
   */
  @impl.adapted
  @impl.reason("Context allocation replaces the compile-time platform include. The final raytracing selector replaces the C++ pipeline overload; neither JS backend supports it. Shared ownership is GC-finalized.")
  Create(description, program, renderContext, raytracing = false)
  {
    this.m_resourceSet = nullRS;
    if (raytracing) return ALResult.E_FAIL;
    const { result, implementation } = renderContext.CreateResourceSet(description, program, true);
    if (Failed(result)) return result;
    this.m_resourceSet = { implementation };
    release.register(this.m_resourceSet, implementation);
    return result;
  }

  /** Reports whether the shared backend implementation is valid. */
  IsValid()
  {
    return this.m_resourceSet.implementation.IsValid();
  }

  /** Returns the shared backend implementation's memory class. */
  GetMemoryClass()
  {
    return this.m_resourceSet.implementation.GetMemoryClass();
  }

  /** Names a valid resource set, rejecting an absent name. */
  SetName(name)
  {
    if (!this.IsValid()) return ALResult.E_INVALIDCALL;
    if (name === null || name === undefined) return ALResult.E_INVALIDARG;
    return this.m_resourceSet.implementation.SetName(name);
  }

  /** Resets this handle while allowing other owners to retain its implementation. */
  @impl.adapted
  @impl.reason("JavaScript has no scope destructor. Existing effect teardown resets this handle explicitly; shared copies retain the backend until their last ownership record is collected.")
  Destroy()
  {
    this.m_resourceSet = nullRS;
  }
}
