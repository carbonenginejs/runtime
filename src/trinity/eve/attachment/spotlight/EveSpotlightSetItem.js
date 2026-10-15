import { IRoot } from "../../../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpotlightSetItem.h
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpotlightSetItem.cpp
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpotlightSetItem_Blue.cpp
import { box3 } from "#math/box3";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { meta, type, blue } from "#schema";

/**
 * One authored spotlight: its bone attachment, placement matrix, the separate
 * cone, flare and sprite colours drawn for it, and whether booster gain
 * modulates it.
 */
@blue.define("EveSpotlightSetItem")
@blue.inherit(IRoot)
export class EveSpotlightSetItem
{
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  @blue.readwrite
  @blue.persist
  @type.int32
  boneIndex = 0;

  @blue.readwrite
  @blue.persist
  @type.color
  coneColor = vec4.fromValues(1, 1, 1, 1);

  @blue.readwrite
  @blue.persist
  @type.color
  flareColor = vec4.fromValues(1, 1, 1, 1);

  @blue.readwrite
  @blue.persist
  @type.color
  spriteColor = vec4.fromValues(1, 1, 1, 1);

  @blue.readwrite
  @blue.persist
  @type.mat4
  transform = mat4.create();

  @blue.readwrite
  @blue.persist
  @type.vec3
  spriteScale = vec3.fromValues(1, 1, 1);

  @blue.readwrite
  @blue.persist
  @type.boolean
  boosterGainInfluence = false;

  /**
   * Fills the caller-owned out box with the spotlight's unit box transformed by
   * its authored placement matrix.
   *
   * Adapted: Carbon returns AxisAlignedBox by value; JavaScript fills a caller-supplied
   * box3.
   */
  @blue.method
  @meta.adapted
  GetBounds(out)
  {
    return box3.transformMat4(out, EveSpotlightSetItem._bounds, this.transform);
  }

  /** The parent bone this spotlight rides. */
  @blue.method
  @meta.implemented
  GetBoneIndex()
  {
    return this.boneIndex;
  }

  static _bounds = box3.fromValues(-0.5, -0.5, -0.5, 0.5, 0.5, 0.5);
}
