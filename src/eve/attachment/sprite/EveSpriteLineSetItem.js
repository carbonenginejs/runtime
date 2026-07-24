// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Attachments\Sets\EveSpriteLineSetItem.h
// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Attachments\Sets\EveSpriteLineSetItem.cpp
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { quat } from "@carbonenginejs/runtime-utils/quat";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";


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

  static GetSpriteCount(value)
  {
    const count = Math.trunc(Number(value));
    return Number.isFinite(count) && count > 0 ? count : 0;
  }

  @carbon.method
  @impl.adapted
  GetBounds(out = vec4.create())
  {
    if (this.isCircle)
    {
      return vec4.set(out, this.position[0], this.position[1], this.position[2], Math.max(this.scaling[0], this.scaling[1]));
    }

    const count = EveSpriteLineSetItem.GetSpriteCount(this.scaling[0]);
    const direction = vec3.transformQuat(vec3.create(), EveSpriteLineSetItem.#unitX, this.rotation);
    const distance = count * this.spacing;
    const center = vec3.scaleAndAdd(vec3.create(), this.position, direction, distance * 0.5);
    return vec4.set(out, center[0], center[1], center[2], distance * 0.5);
  }

  @carbon.method
  @impl.implemented
  GetBoneIndex()
  {
    return this.boneIndex;
  }

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
