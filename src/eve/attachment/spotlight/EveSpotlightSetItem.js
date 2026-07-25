// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Attachments\Sets\EveSpotlightSetItem.h
// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Attachments\Sets\EveSpotlightSetItem.cpp
// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Attachments\Sets\EveSpotlightSetItem_Blue.cpp
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { box3 } from "@carbonenginejs/runtime-utils/box3";
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";

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

  @carbon.method
  @impl.adapted
  @impl.reason("Carbon returns AxisAlignedBox by value; JavaScript returns cloned { min, max } vectors.")
  GetBounds()
  {
    const bounds = box3.transformMat4(box3.create(), EveSpotlightSetItem.#bounds, this.transform);
    const min = vec3.create();
    const max = vec3.create();
    box3.toBounds(bounds, min, max);
    return { min, max };
  }

  @carbon.method
  @impl.implemented
  GetBoneIndex()
  {
    return this.boneIndex;
  }

  static #bounds = box3.fromValues(-0.5, -0.5, -0.5, 0.5, 0.5, 0.5);
}
