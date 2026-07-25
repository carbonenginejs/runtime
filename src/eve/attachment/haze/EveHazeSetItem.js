// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Attachments\Sets\EveHazeSetItem.h
// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Attachments\Sets\EveHazeSetItem.cpp
// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Attachments\Sets\EveHazeSetItem_Blue.cpp
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { box3 } from "@carbonenginejs/runtime-utils/box3";
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { quat } from "@carbonenginejs/runtime-utils/quat";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";

@type.define({ className: "EveHazeSetItem", family: "eve/attachment/haze" })
export class EveHazeSetItem extends CjsModel
{
  @io.persist
  @type.color
  color = vec4.fromValues(1, 1, 1, 1);

  @io.persist
  @type.quat
  rotation = quat.create();

  @io.persist
  @type.vec3
  scaling = vec3.fromValues(1, 1, 1);

  @io.persist
  @type.string
  name = "";

  @io.persist
  @type.int32
  boneIndex = 0;

  @io.persist
  @type.vec3
  position = vec3.create();

  @io.persist
  @type.vec4
  hazeData = vec4.fromValues(4, 0.2, 2, 0);

  @carbon.method
  @impl.adapted
  @impl.reason("Carbon returns AxisAlignedBox by value; JavaScript returns cloned { min, max } vectors.")
  GetBounds()
  {
    // Carbon (row-vector): TransformationMatrix(scaling, rotation, position).
    const transform = mat4.fromRotationTranslationScale(
      mat4.create(),
      this.rotation,
      this.position,
      this.scaling
    );
    const bounds = box3.transformMat4(box3.create(), EveHazeSetItem.#bounds, transform);
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

  static #bounds = box3.fromValues(-0.5, -0.5, -0.5, 0.5, 0.5, 5);
}
