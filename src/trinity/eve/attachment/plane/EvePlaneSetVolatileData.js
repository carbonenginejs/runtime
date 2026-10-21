// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EvePlaneSet.h:140-144
import { mat4 } from "#math/mat4";
import { vec4 } from "#math/vec4";
import { type, meta } from "#schema";

/**
 * Carbon EvePlaneSet::VolatileData: one packed plane's local transform and
 * colour, as EvePlaneSet::Rebuild pushes them into m_volatileData
 * (EvePlaneSet.cpp:302-303) for AddToQuadRenderer. Carbon gives it no
 * initializers.
 */
@meta.carbon("EvePlaneSet::VolatileData")
export class EvePlaneSetVolatileData
{

  /** transform (Matrix). Carbon leaves it unset. */
  @type.mat4
  transform = mat4.create();

  /** color (Vector4). Carbon leaves it unset. */
  @type.vec4
  color = vec4.create();

}
