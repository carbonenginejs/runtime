// Source: trinity/trinity/Tr2BindingVector3.h
// Source: trinity/trinity/Tr2BindingVector3_Blue.cpp
import { meta } from "#schema";
import { vec3 } from "#math/vec3";

/** A shared vector value used by bindings, including space-object position deltas. */
@meta.define({ className: "Tr2BindingVector3", family: "trinityCore" })
export class Tr2BindingVector3
{

  /** m_value (Vector3) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  value = vec3.create();

}

// Carbon's own query table has no exposure chain.
meta.blue.interfaceTable({ interfaces: [Tr2BindingVector3], chainTo: null })(Tr2BindingVector3, { kind: "class" });
