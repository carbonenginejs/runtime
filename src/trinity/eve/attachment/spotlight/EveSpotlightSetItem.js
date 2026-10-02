// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpotlightSetItem.h
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpotlightSetItem.cpp
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpotlightSetItem_Blue.cpp
import { box3 } from "#math/box3";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { meta } from "#schema";

/**
 * One authored spotlight: its bone attachment, placement matrix, the separate
 * cone, flare and sprite colours drawn for it, and whether booster gain
 * modulates it.
 */
@meta.define({ className: "EveSpotlightSetItem", family: "eve/attachment/spotlights" })
export class EveSpotlightSetItem
{
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.int32
  boneIndex = 0;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  coneColor = vec4.fromValues(1, 1, 1, 1);

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  flareColor = vec4.fromValues(1, 1, 1, 1);

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  spriteColor = vec4.fromValues(1, 1, 1, 1);

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.mat4
  transform = mat4.create();

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  spriteScale = vec3.fromValues(1, 1, 1);

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  boosterGainInfluence = false;

  /**
   * Fills the caller-owned out box with the spotlight's unit box transformed by
   * its authored placement matrix.
   */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Carbon returns AxisAlignedBox by value; JavaScript fills a caller-supplied box3.")
  GetBounds(out)
  {
    return box3.transformMat4(out, EveSpotlightSetItem._bounds, this.transform);
  }

  /** The parent bone this spotlight rides. */
  @meta.blue.method
  @meta.implemented
  GetBoneIndex()
  {
    return this.boneIndex;
  }

  static _bounds = box3.fromValues(-0.5, -0.5, -0.5, 0.5, 0.5, 0.5);
}
