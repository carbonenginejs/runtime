// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpriteSet.h:70-74
import { vec3 } from "#math/vec3";
import { type, meta } from "#schema";

/**
 * Carbon EveSpriteSet::SpriteData: one sprite's position and bone, as
 * EveSpriteSet keeps them in m_spriteData for culling and debug drawing.
 * Carbon gives it no initializers.
 */
@meta.define({ className: "EveSpriteSetSpriteData", donors: [ "EveSpriteSet::SpriteData" ] })
export class EveSpriteSetSpriteData
{

  /** position (Vector3). Carbon leaves it unset. */
  @type.vec3
  position = vec3.create();

  /** boneIndex (uint32_t). Carbon leaves it unset. */
  @type.uint32
  boneIndex = 0;

}
