// Source: trinity/trinity/TriDebugResourceHelper.h:36-39
import { vec3 } from "#math/vec3";
import { type, meta } from "#schema";

/**
 * Carbon TriDebugResourceHelper::VertexPos: a position-only debug vertex, the
 * layout of GetVertexPosDecl (12 bytes). Carbon gives it no initializers.
 */
@meta.define({"className":"TriDebugResourceHelperVertexPos","carbon":"TriDebugResourceHelper::VertexPos"})
export class TriDebugResourceHelperVertexPos
{

  /** m_pos. Carbon leaves it unset. */
  @type.vec3
  pos = vec3.create();

}
