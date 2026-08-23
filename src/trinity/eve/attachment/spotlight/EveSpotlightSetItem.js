// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpotlightSetItem.h
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpotlightSetItem.cpp
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpotlightSetItem_Blue.cpp
import { CjsModel } from "#model";
import { box3 } from "#math/box3";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { carbon, impl, io, type } from "#schema";

/**
 * One authored spotlight: its bone attachment, placement matrix, the separate
 * cone, flare and sprite colours drawn for it, and whether booster gain
 * modulates it.
 */
@type.define({ className: "EveSpotlightSetItem", family: "eve/attachment/spotlights" })
export class EveSpotlightSetItem extends CjsModel
{
  @io.persist
  @type.string
  name = "";

  @io.persist
  @type.int32
  boneIndex = 0;

  @io.persist
  @type.color
  coneColor = vec4.fromValues(1, 1, 1, 1);

  @io.persist
  @type.color
  flareColor = vec4.fromValues(1, 1, 1, 1);

  @io.persist
  @type.color
  spriteColor = vec4.fromValues(1, 1, 1, 1);

  @io.persist
  @type.mat4
  transform = mat4.create();

  @io.persist
  @type.vec3
  spriteScale = vec3.fromValues(1, 1, 1);

  @io.persist
  @type.boolean
  boosterGainInfluence = false;

  /**
   * Fills the caller-owned out box with the spotlight's unit box transformed by
   * its authored placement matrix.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon returns AxisAlignedBox by value; JavaScript fills a caller-supplied box3.")
  GetBounds(out)
  {
    return box3.transformMat4(out, EveSpotlightSetItem.#bounds, this.transform);
  }

  /** The parent bone this spotlight rides. */
  @carbon.method
  @impl.implemented
  GetBoneIndex()
  {
    return this.boneIndex;
  }

  static #bounds = box3.fromValues(-0.5, -0.5, -0.5, 0.5, 0.5, 0.5);
}
