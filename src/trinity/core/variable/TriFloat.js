// Source: trinity/trinity/TriFloat.h
// Source: trinity/trinity/TriFloat.cpp
// Source: trinity/trinity/TriFloat_Blue.cpp
import { meta, types } from "#schema";

/**
 * Separate scalar storage that breaks stretch-to-binding reference cycles.
 * Native TriFloat.h keeps a stretch length outside its owning stretch so a
 * curve-set binding can hold the scalar without retaining the stretch.
 */
@meta.define({ className: "TriFloat", family: "trinityCore" })
export class TriFloat
{

  /** m_value (float) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  value = 0;

}

// Native IRoot record: concrete query identity with no exposure chain.
meta.carbon.interfaceTable({ interfaces: [TriFloat], chainTo: null })(TriFloat, { kind: "class" });
