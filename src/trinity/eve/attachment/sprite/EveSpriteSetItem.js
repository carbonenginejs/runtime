// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpriteSetItem.h
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpriteSetItem.cpp
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpriteSetItem_Blue.cpp
import { vec3 } from "#math/vec3";
import { box3 } from "#math/box3";
import { vec4 } from "#math/vec4";
import { meta } from "#schema";

/**
 * One authored sprite: its bone attachment, position, blink timing, scale range,
 * falloff and normal and warp colours.
 */
@meta.define({ className: "EveSpriteSetItem", family: "eve/attachment/sprites" })
export class EveSpriteSetItem
{
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  blinkRate = 0.1;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  blinkPhase = 0;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  minScale = 1;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  maxScale = 10;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  falloff = 0;

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  position = vec3.create();

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  color = vec4.fromValues(1, 1, 1, 1);

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  warpColor = vec4.fromValues(1, 1, 1, 1);

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.int32
  boneIndex = 0;

  /** Carbon EveSpriteSetItem::GetBounds (cpp:35-38): Sphere(position, maxScale)
   * - the sprite at its largest blink scale. `out` is required; the item-set
   * bounds builder supplies its own scratch. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Carbon returns Sphere by value; JavaScript follows the runtime sphere out-parameter convention.")
  GetBounds(out)
  {
    return box3.fromPositionRadius(out, this.position, this.maxScale);
  }

  /** The parent bone this sprite rides. */
  @meta.blue.method
  @meta.implemented
  GetBoneIndex()
  {
    return this.boneIndex;
  }
}
