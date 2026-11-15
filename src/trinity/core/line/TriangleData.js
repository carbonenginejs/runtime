// Source: trinity/trinity/Tr2SolidSet.h
// Source: trinity/trinity/Tr2SolidSet.cpp
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { meta, type } from "#schema";

/**
 * Carbon TriangleData (Tr2SolidSet.h:10-19): one triangle of a Tr2SolidSet with its colours and face normal, as
 * AddTriangle builds it (Tr2SolidSet.cpp:158-176). Carbon gives its members no initializers; ours start at zero.
 */
@meta.define({"name":"TriangleData","carbon":"TriangleData"})
export class TriangleData
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

  /** m_position3 (Vector3) */
  @type.vec3
  position3 = vec3.create();

  /** m_color3 (Color) */
  @type.color
  color3 = vec4.create();

  /** m_normal (Vector3): the face normal, Normalize( Cross( position1 - position3, position2 - position1 ) ). */
  @type.vec3
  normal = vec3.create();

}
