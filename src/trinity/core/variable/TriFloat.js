import { exposure as be } from "#be";
import { IRoot } from "../../../global/blue/IRoot.js";
// Source: trinity/trinity/TriFloat.h
// Source: trinity/trinity/TriFloat.cpp
// Source: trinity/trinity/TriFloat_Blue.cpp
import { type, blue } from "#schema";

/**
 * Separate scalar storage that breaks stretch-to-binding reference cycles.
 * Native TriFloat.h keeps a stretch length outside its owning stretch so a
 * curve-set binding can hold the scalar without retaining the stretch.
 */
@be.define("TriFloat")

@blue.inherit(IRoot)
export class TriFloat extends IRoot
{

  /** m_value (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  value = 0;

}

// Native IRoot record: concrete query identity with no exposure chain.
