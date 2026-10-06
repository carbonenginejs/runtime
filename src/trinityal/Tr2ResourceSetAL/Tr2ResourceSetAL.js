// Source: trinity/trinityal/include/Tr2ResourceSetAL.h:129
// Source: trinity/trinityal/src/Tr2ResourceSetAL.cpp:547-607
import { meta } from "#schema";
import { ALResult, Failed } from "../ALResult.js";
import { Tr2ALMemoryType } from "#consts/graphics";

// Explicit shares replace shared_ptr scope destruction; no GC-owned release.
const nullRS = {
  owners: Infinity,
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
    if (copy)
    {
      this.m_resourceSet = copy.m_resourceSet;
      this.m_resourceSet.owners += 1;
    }
  }

  /**
   * Carbon's bare Create is not supported: the program and pipeline overloads
   * (Tr2ResourceSetAL.h:134-135) differ only in our own classes. Call
   * Create__Program or Create__Pipeline.
   */
  Create()
  {
    throw new Error("Tr2ResourceSetAL.Create is not supported; call Create__Program or Create__Pipeline.");
  }

  /**
   * Carbon's Create( description, pipeline, renderContext ) (h:135): raytracing
   * resource sets, which neither JS backend supports.
   */
  @meta.adapted
  Create__Pipeline(_description, _pipeline, _renderContext)
  {
    this.Destroy();
    return ALResult.E_FAIL;
  }

  /**
   * Carbon's Create( description, program, renderContext ) (h:134): creates a
   * backend-selected resource set and replaces this handle's shared ownership
   * record.
   *
   * Adapted: Context allocation replaces the compile-time platform include. Shared ownership
   * is explicitly released.
   */
  @meta.adapted
  Create__Program(description, program, renderContext)
  {
    this.Destroy();
    const { result, implementation } = renderContext.CreateResourceSet(description, program, true);
    if (Failed(result)) return result;
    this.m_resourceSet = { implementation, owners: 1 };
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

  /**
   * Resets this handle while allowing other owners to retain its implementation.
   *
   * Adapted: JavaScript has no scope destructor. Existing effect teardown resets this handle
   * explicitly; shared copies retain the backend until their final explicit reset.
   */
  @meta.adapted
  Destroy()
  {
    const owned = this.m_resourceSet;
    this.m_resourceSet = nullRS;
    if (--owned.owners === 0) owned.implementation.Destroy();
  }
}
