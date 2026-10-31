import { exposure as be } from "#be";
import { IRoot } from "../../../../global/blueexposure/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpotlightSetItem.h
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpotlightSetItem.cpp
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpotlightSetItem_Blue.cpp
import { box3 } from "#math/box3";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { type, blue } from "#schema";

/**
 * One authored spotlight: its bone attachment, placement matrix, the separate
 * cone, flare and sprite colours drawn for it, and whether booster gain
 * modulates it.
 */
@be.define("EveSpotlightSetItem")
@be.inherit(IRoot)
export class EveSpotlightSetItem extends IRoot
{
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "";

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.int32
  boneIndex = 0;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.color
  coneColor = vec4.fromValues(1, 1, 1, 1);

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.color
  flareColor = vec4.fromValues(1, 1, 1, 1);

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.color
  spriteColor = vec4.fromValues(1, 1, 1, 1);

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.mat4
  transform = mat4.create();

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.vec3
  spriteScale = vec3.fromValues(1, 1, 1);

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  boosterGainInfluence = false;

  /**
   * Fills the caller-owned out box with the spotlight's unit box transformed by
   * its authored placement matrix.
   *
   * @adapted Carbon returns AxisAlignedBox by value; JavaScript fills a caller-supplied
   *   box3.
   */

  GetBounds(out)
  {
    return box3.transformMat4(out, EveSpotlightSetItem._bounds, this.transform);
  }

  /**
   * The parent bone this spotlight rides.
   *
   * @implemented
   */

  GetBoneIndex()
  {
    return this.boneIndex;
  }

  static _bounds = box3.fromValues(-0.5, -0.5, -0.5, 0.5, 0.5, 0.5);
}
