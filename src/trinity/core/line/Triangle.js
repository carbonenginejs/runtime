// Source: trinity/trinity/Tr2LineSet.h
// Source: trinity/trinity/Tr2LineSet.cpp
import { vec3 } from "#math/vec3";
import { meta, type } from "#schema";

/**
 * Carbon Triangle (Tr2LineSet.h:19-24): one picking triangle of a Tr2LineSet, as AddPickingTriangle builds it
 * (Tr2LineSet.cpp:193-202). Carbon gives its members no initializers; ours start at zero.
 */
@meta.define({"name":"Triangle","carbon":"Triangle"})
export class Triangle
{

  /** m_position1 (Vector3) */
  @type.vec3
  position1 = vec3.create();

  /** m_position2 (Vector3) */
  @type.vec3
  position2 = vec3.create();

  /** m_position3 (Vector3) */
  @type.vec3
  position3 = vec3.create();

}
