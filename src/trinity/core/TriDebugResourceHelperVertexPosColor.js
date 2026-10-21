// Source: trinity/trinity/TriDebugResourceHelper.h:41-45
import { vec3 } from "#math/vec3";
import { type, meta } from "#schema";

/**
 * Carbon TriDebugResourceHelper::VertexPosColor: a position and a packed
 * colour, the layout of GetVertexPosColorDecl (16 bytes). Carbon gives it no
 * initializers.
 */
@meta.carbon("TriDebugResourceHelper::VertexPosColor")
export class TriDebugResourceHelperVertexPosColor
{

  /** m_pos. Carbon leaves it unset. */
  @type.vec3
  pos = vec3.create();

  /** m_color: packed colour. Carbon leaves it unset. */
  @type.uint32
  color = 0;

}
