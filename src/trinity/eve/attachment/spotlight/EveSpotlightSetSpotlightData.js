// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpotlightSet.h:143-148
import { mat4 } from "#math/mat4";
import { type, meta } from "#schema";

/**
 * Carbon EveSpotlightSet::SpotlightData: one spotlight's transform, bone and
 * booster gain influence, as EveSpotlightSet::Rebuild copies them from the
 * items into m_spotlightData (EveSpotlightSet.cpp:279-286) for
 * AddToQuadRenderer. Carbon gives it no initializers.
 */
@meta.carbon("EveSpotlightSet::SpotlightData")
export class EveSpotlightSetSpotlightData
{

  /** transform (Matrix). Carbon leaves it unset. */
  @type.mat4
  transform = mat4.create();

  /** boneIndex (uint32_t). Carbon leaves it unset. */
  @type.uint32
  boneIndex = 0;

  /** boosterGainInfluence (float). Carbon leaves it unset. */
  @type.float32
  boosterGainInfluence = 0;

}
