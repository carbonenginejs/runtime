// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpriteSetItem.h
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpriteSetItem.cpp
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpriteSetItem_Blue.cpp
import { CjsModel } from "#model";
import { vec3 } from "#math/vec3";
import { box3 } from "#math/box3";
import { vec4 } from "#math/vec4";
import { carbon, impl, io, type } from "#schema";

/**
 * One authored sprite: its bone attachment, position, blink timing, scale range,
 * falloff and normal and warp colours.
 */
@type.define({ className: "EveSpriteSetItem", family: "eve/attachment/sprites" })
export class EveSpriteSetItem extends CjsModel
{
  @io.persist
  @type.string
  name = "";

  @io.persist
  @type.float32
  blinkRate = 0.1;

  @io.persist
  @type.float32
  blinkPhase = 0;

  @io.persist
  @type.float32
  minScale = 1;

  @io.persist
  @type.float32
  maxScale = 10;

  @io.persist
  @type.float32
  falloff = 0;

  @io.notify
  @io.persist
  @type.vec3
  position = vec3.create();

  @io.notify
  @io.persist
  @type.color
  color = vec4.fromValues(1, 1, 1, 1);

  @io.notify
  @io.persist
  @type.color
  warpColor = vec4.fromValues(1, 1, 1, 1);

  @io.persist
  @type.int32
  boneIndex = 0;

  /** Carbon EveSpriteSetItem::GetBounds (cpp:35-38): Sphere(position, maxScale)
   * - the sprite at its largest blink scale. `out` is required; the item-set
   * bounds builder supplies its own scratch. */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon returns Sphere by value; JavaScript follows the runtime sphere out-parameter convention.")
  GetBounds(out)
  {
    return box3.fromPositionRadius(out, this.position, this.maxScale);
  }

  /** The parent bone this sprite rides. */
  @carbon.method
  @impl.implemented
  GetBoneIndex()
  {
    return this.boneIndex;
  }
}
