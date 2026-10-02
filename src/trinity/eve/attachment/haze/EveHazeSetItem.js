// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveHazeSetItem.h
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveHazeSetItem.cpp
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveHazeSetItem_Blue.cpp
import { box3 } from "#math/box3";
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { meta } from "#schema";

/**
 * One authored haze volume: its bone attachment, placement, colour and the
 * four-component haze shaping data.
 */
@meta.define({ className: "EveHazeSetItem", family: "eve/attachment/haze" })
export class EveHazeSetItem
{
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  color = vec4.fromValues(1, 1, 1, 1);

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.quat
  rotation = quat.create();

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  scaling = vec3.fromValues(1, 1, 1);

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.int32
  boneIndex = 0;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  position = vec3.create();

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec4
  hazeData = vec4.fromValues(4, 0.2, 2, 0);

  /**
   * Fills the caller-owned out box with the haze's authored source box - which
   * reaches to z 5 rather than 0.5, because a haze extends well beyond its
   * placement - transformed by its rotation, position and scaling.
   */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Carbon returns AxisAlignedBox by value; JavaScript fills a caller-supplied box3.")
  GetBounds(out)
  {
    // Carbon (row-vector): TransformationMatrix(scaling, rotation, position).
    const transform = mat4.fromRotationTranslationScale(
      EveHazeSetItem._transform,
      this.rotation,
      this.position,
      this.scaling
    );
    return box3.transformMat4(out, EveHazeSetItem._bounds, transform);
  }

  /** The parent bone this haze volume rides. */
  @meta.blue.method
  @meta.implemented
  GetBoneIndex()
  {
    return this.boneIndex;
  }

  static _bounds = box3.fromValues(-0.5, -0.5, -0.5, 0.5, 0.5, 5);

  static _transform = mat4.create();
}
