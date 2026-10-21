import { exposure as be } from "#be";
import { IRoot } from "../../../global/blue/IRoot.js";
// Source: trinity/trinity/Tr2BindingVector3.h
// Source: trinity/trinity/Tr2BindingVector3_Blue.cpp
import { type, blue } from "#schema";
import { vec3 } from "#math/vec3";

/** A shared vector value used by bindings, including space-object position deltas. */
@be.define("Tr2BindingVector3")

@blue.inherit(IRoot)
export class Tr2BindingVector3 extends IRoot
{

  /** m_value (Vector3) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.vec3
  value = vec3.create();

}

// Carbon's own query table has no exposure chain.
