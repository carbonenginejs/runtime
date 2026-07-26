// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Attachments\Sets\EveSpriteLineSetItem.h
// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Attachments\Sets\EveSpriteLineSetItem.cpp
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { quat } from "@carbonenginejs/runtime-utils/quat";
import { box3 } from "@carbonenginejs/runtime-utils/box3";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";


/**
 * One authored run of identical sprites, laid out either evenly along a line or
 * distributed around a circle, with the blink timing and colour they share.
 */
@type.define({ className: "EveSpriteLineSetItem", family: "eve/attachment/sprites" })
export class EveSpriteLineSetItem extends CjsModel
{
  @io.rebuild("packedGeometry")
  @io.persist
  @type.int32
  boneIndex = 0;

  @io.persist
  @type.string
  name = "";

  @io.rebuild("packedGeometry")
  @io.persist
  @type.boolean
  isCircle = false;

  @io.rebuild("packedGeometry")
  @io.persist
  @type.vec3
  position = vec3.create();

  @io.rebuild("packedGeometry")
  @io.persist
  @type.quat
  rotation = quat.create();

  @io.rebuild("packedGeometry")
  @io.persist
  @type.vec3
  scaling = vec3.fromValues(1, 1, 1);

  @io.rebuild("packedGeometry")
  @io.persist
  @type.float32
  spacing = 1;

  @io.rebuild("packedGeometry")
  @io.persist
  @type.float32
  blinkRate = 0.1;

  @io.rebuild("packedGeometry")
  @io.persist
  @type.float32
  blinkPhase = 0;

  @io.rebuild("packedGeometry")
  @io.persist
  @type.float32
  blinkPhaseShift = 0;

  @io.rebuild("packedGeometry")
  @io.persist
  @type.float32
  minScale = 1;

  @io.rebuild("packedGeometry")
  @io.persist
  @type.float32
  maxScale = 10;

  @io.rebuild("packedGeometry")
  @io.persist
  @type.float32
  falloff = 0;

  @io.rebuild("packedGeometry")
  @io.persist
  @type.color
  color = vec4.fromValues(1, 1, 1, 1);

  /**
   * Coerces an authored count field to a whole, non-negative sprite count; a
   * non-finite or non-positive value yields zero.
   */
  static GetSpriteCount(value)
  {
    const count = Math.trunc(Number(value));
    return Number.isFinite(count) && count > 0 ? count : 0;
  }

  /**
   * Fills the caller-owned out box with the run's bounds: for a circle, a box
   * around the position at the larger of the two radii; for a line, a box
   * centred on the run covering its full spaced length.
   */
  @carbon.method
  @impl.adapted
  GetBounds(out)
  {
    if (this.isCircle)
    {
      return box3.fromPositionRadius(out, this.position, Math.max(this.scaling[0], this.scaling[1]));
    }

    const count = EveSpriteLineSetItem.GetSpriteCount(this.scaling[0]);
    const direction = vec3.transformQuat(vec3.create(), EveSpriteLineSetItem.#unitX, this.rotation);
    const distance = count * this.spacing;
    const center = vec3.scaleAndAdd(vec3.create(), this.position, direction, distance * 0.5);
    return box3.fromPositionRadius(out, center, distance * 0.5);
  }

  /** The parent bone this sprite run rides. */
  @carbon.method
  @impl.implemented
  GetBoneIndex()
  {
    return this.boneIndex;
  }

  /**
   * Expands the run into its individual sprite positions in parent space -
   * stepped around the rotated ellipse for a circle, or spaced along the rotated
   * X axis for a line - as freshly allocated vectors.
   */
  @carbon.method
  @impl.adapted
  GetPositions()
  {
    const positions = [];
    if (this.isCircle)
    {
      const count = EveSpriteLineSetItem.GetSpriteCount(this.spacing);
      const step = Math.PI * 2 / this.spacing;
      for (let index = 0; index < count; index++)
      {
        const alpha = step * index;
        const position = vec3.fromValues(this.scaling[0] * Math.sin(alpha), 0, this.scaling[1] * Math.cos(alpha));
        vec3.transformQuat(position, position, this.rotation);
        vec3.add(position, position, this.position);
        positions.push(position);
      }
      return positions;
    }

    const count = EveSpriteLineSetItem.GetSpriteCount(this.scaling[0]);
    const direction = vec3.transformQuat(vec3.create(), EveSpriteLineSetItem.#unitX, this.rotation);
    for (let index = 0; index < count; index++)
    {
      positions.push(vec3.scaleAndAdd(vec3.create(), this.position, direction, this.spacing * index));
    }
    return positions;
  }

  static #unitX = vec3.fromValues(1, 0, 0);
}
