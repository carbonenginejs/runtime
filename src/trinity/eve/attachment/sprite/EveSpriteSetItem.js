import { exposure as be } from "#be";
import { IRoot } from "../../../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpriteSetItem.h
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpriteSetItem.cpp
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpriteSetItem_Blue.cpp
import { vec3 } from "#math/vec3";
import { box3 } from "#math/box3";
import { vec4 } from "#math/vec4";
import { meta, type, blue } from "#schema";

/**
 * One authored sprite: its bone attachment, position, blink timing, scale range,
 * falloff and normal and warp colours.
 */
@be.define("EveSpriteSetItem")
@blue.inherit(IRoot)
export class EveSpriteSetItem extends IRoot
{
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "";

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  blinkRate = 0.1;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  blinkPhase = 0;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  minScale = 1;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  maxScale = 10;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  falloff = 0;

  @be.mapAttribute(be.READWRITE | be.NOTIFY | be.PERSIST)


  @type.vec3
  position = vec3.create();

  @be.mapAttribute(be.READWRITE | be.NOTIFY | be.PERSIST)


  @type.color
  color = vec4.fromValues(1, 1, 1, 1);

  @be.mapAttribute(be.READWRITE | be.NOTIFY | be.PERSIST)


  @type.color
  warpColor = vec4.fromValues(1, 1, 1, 1);

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.int32
  boneIndex = 0;

  /**
   * Carbon EveSpriteSetItem::GetBounds (cpp:35-38): Sphere(position, maxScale)
   * - the sprite at its largest blink scale. `out` is required; the item-set
   * bounds builder supplies its own scratch.
   *
   * Adapted: Carbon returns Sphere by value; JavaScript follows the runtime sphere
   * out-parameter convention.
   */

  @meta.adapted
  GetBounds(out)
  {
    return box3.fromPositionRadius(out, this.position, this.maxScale);
  }

  /** The parent bone this sprite rides. */

  @meta.implemented
  GetBoneIndex()
  {
    return this.boneIndex;
  }
}
