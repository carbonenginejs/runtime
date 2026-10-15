import { IRoot } from "../../../global/blue/IRoot.js";
// Source: trinity/trinity/Tr2BindingVector3.h
// Source: trinity/trinity/Tr2BindingVector3_Blue.cpp
import { type, blue } from "#schema";
import { vec3 } from "#math/vec3";

/** A shared vector value used by bindings, including space-object position deltas. */
@blue.define("Tr2BindingVector3")
@blue.interface()
@blue.inherit(IRoot)
export class Tr2BindingVector3
{

  /** m_value (Vector3) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.vec3
  value = vec3.create();

}

// Carbon's own query table has no exposure chain.
