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
@blue.define("EveSpriteSetItem")
export class EveSpriteSetItem
{
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  @blue.readwrite
  @blue.persist
  @type.float32
  blinkRate = 0.1;

  @blue.readwrite
  @blue.persist
  @type.float32
  blinkPhase = 0;

  @blue.readwrite
  @blue.persist
  @type.float32
  minScale = 1;

  @blue.readwrite
  @blue.persist
  @type.float32
  maxScale = 10;

  @blue.readwrite
  @blue.persist
  @type.float32
  falloff = 0;

  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.vec3
  position = vec3.create();

  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.color
  color = vec4.fromValues(1, 1, 1, 1);

  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.color
  warpColor = vec4.fromValues(1, 1, 1, 1);

  @blue.readwrite
  @blue.persist
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
  @blue.method
  @meta.adapted
  GetBounds(out)
  {
    return box3.fromPositionRadius(out, this.position, this.maxScale);
  }

  /** The parent bone this sprite rides. */
  @blue.method
  @meta.implemented
  GetBoneIndex()
  {
    return this.boneIndex;
  }
}
