// Source: trinity/trinity/Tr2LineSet.h
// Source: trinity/trinity/Tr2LineSet.cpp
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { meta, type } from "#schema";

/**
 * Carbon LineData (Tr2LineSet.h:10-16): one line of a Tr2LineSet, as AddLine builds it (Tr2LineSet.cpp:180-190).
 * A file-scope struct, not Tr2CurveLineSet's nested LineData. Carbon gives its members no initializers; ours start
 * at zero.
 */
@meta.define({"name":"LineData","carbon":"LineData"})
export class LineData
{

  /** m_position1 (Vector3) */
  @type.vec3
  position1 = vec3.create();

  /** m_color1 (Color) */
  @type.color
  color1 = vec4.create();

  /** m_position2 (Vector3) */
  @type.vec3
  position2 = vec3.create();

  /** m_color2 (Color) */
  @type.color
  color2 = vec4.create();

}
