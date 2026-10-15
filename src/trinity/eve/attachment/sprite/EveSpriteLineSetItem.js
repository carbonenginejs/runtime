import { IRoot } from "../../../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpriteLineSetItem.h
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpriteLineSetItem.cpp
import { quat } from "#math/quat";
import { box3 } from "#math/box3";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { meta, type, blue } from "#schema";


/**
 * One authored run of identical sprites, laid out either evenly along a line or
 * distributed around a circle, with the blink timing and colour they share.
 */
@blue.define("EveSpriteLineSetItem")
@blue.inherit(IRoot)
export class EveSpriteLineSetItem
{

  @blue.readwrite
  @blue.persist
  @type.int32
  boneIndex = 0;

  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  @blue.readwrite
  @blue.persist
  @type.boolean
  isCircle = false;

  @blue.readwrite
  @blue.persist
  @type.vec3
  position = vec3.create();

  @blue.readwrite
  @blue.persist
  @type.quat
  rotation = quat.create();

  @blue.readwrite
  @blue.persist
  @type.vec3
  scaling = vec3.fromValues(1, 1, 1);

  @blue.readwrite
  @blue.persist
  @type.float32
  spacing = 1;

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
  blinkPhaseShift = 0;

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

  @blue.readwrite
  @blue.persist
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
  @blue.method
  @meta.adapted
  GetBounds(out)
  {
    if (this.isCircle)
    {
      return box3.fromPositionRadius(out, this.position, Math.max(this.scaling[0], this.scaling[1]));
    }

    const count = EveSpriteLineSetItem.GetSpriteCount(this.scaling[0]);
    const direction = vec3.transformQuat(vec3.create(), EveSpriteLineSetItem._unitX, this.rotation);
    const distance = count * this.spacing;
    const center = vec3.scaleAndAdd(vec3.create(), this.position, direction, distance * 0.5);
    return box3.fromPositionRadius(out, center, distance * 0.5);
  }

  /** The parent bone this sprite run rides. */
  @blue.method
  @meta.implemented
  GetBoneIndex()
  {
    return this.boneIndex;
  }

  /**
   * Expands the run into its individual sprite positions in parent space -
   * stepped around the rotated ellipse for a circle, or spaced along the rotated
   * X axis for a line - as freshly allocated vectors.
   */
  @blue.method
  @meta.adapted
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
    const direction = vec3.transformQuat(vec3.create(), EveSpriteLineSetItem._unitX, this.rotation);
    for (let index = 0; index < count; index++)
    {
      positions.push(vec3.scaleAndAdd(vec3.create(), this.position, direction, this.spacing * index));
    }
    return positions;
  }

  static _unitX = vec3.fromValues(1, 0, 0);
}
