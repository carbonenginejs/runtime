// Source: trinity/trinity/Eve/UI/EveTacticalTrails.h
// Source: trinity/trinity/Eve/UI/EveTacticalTrails.cpp
import { meta, type } from "#schema";

/**
 * Carbon EveTacticalTrails::Postion (h:48-52, Carbon's spelling): one kept control point of a trail, its
 * double-precision position and the time it was taken (EveTacticalTrails.cpp UpdateSyncronous). Carbon gives its
 * members no initializers; ours start at zero.
 */
@meta.define({"name":"EveTacticalTrails::Postion","carbon":"EveTacticalTrails::Postion"})
export class EveTacticalTrailsPostion
{

  /** position (Vector3d) */
  @type.vec3d
  position = new Float64Array(3);

  /** time (Be::Time) */
  @type.float64
  time = 0;

}
