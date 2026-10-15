// Source: trinity/trinity/TriFloat.h
// Source: trinity/trinity/TriFloat.cpp
// Source: trinity/trinity/TriFloat_Blue.cpp
import { type, blue } from "#schema";

/**
 * Separate scalar storage that breaks stretch-to-binding reference cycles.
 * Native TriFloat.h keeps a stretch length outside its owning stretch so a
 * curve-set binding can hold the scalar without retaining the stretch.
 */
@blue.define("TriFloat")
@blue.interface()
export class TriFloat
{

  /** m_value (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  value = 0;

}

// Native IRoot record: concrete query identity with no exposure chain.
