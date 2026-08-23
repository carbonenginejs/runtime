// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EvePlaneSetItem.h
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EvePlaneSetItem.cpp
import { CjsModel } from "#model";
import { box3 } from "#math/box3";
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { carbon, impl, io, type } from "#schema";


/**
 * One authored plane: its bone attachment, placement, colour, two independently
 * transformed and scrolling texture layers, mask atlas slot and blink data.
 */
@type.define({ className: "EvePlaneSetItem", family: "eve/attachment/planes" })
export class EvePlaneSetItem extends CjsModel
{
  @io.rebuild("packedGeometry")
  @io.persist
  @type.color
  color = vec4.fromValues(1, 1, 1, 1);

  @io.rebuild("packedGeometry")
  @io.persist
  @type.vec4
  layer1Transform = vec4.fromValues(1, 1, 0, 0);

  @io.rebuild("packedGeometry")
  @io.persist
  @type.vec4
  layer2Transform = vec4.fromValues(1, 1, 0, 0);

  @io.rebuild("packedGeometry")
  @io.persist
  @type.vec4
  layer1Scroll = vec4.create();

  @io.rebuild("packedGeometry")
  @io.persist
  @type.vec4
  layer2Scroll = vec4.create();

  @io.rebuild("packedGeometry")
  @io.persist
  @type.quat
  rotation = quat.create();

  @io.rebuild("packedGeometry")
  @io.persist
  @type.vec3
  scaling = vec3.fromValues(1, 1, 1);

  @io.persist
  @type.string
  name = "";

  @io.rebuild("packedGeometry")
  @io.persist
  @type.uint32
  maskAtlasID = 0;

  @io.rebuild("packedGeometry")
  @io.persist
  @type.int32
  boneIndex = 0;

  @io.rebuild("packedGeometry")
  @io.persist
  @type.vec3
  position = vec3.create();

  // Carbon omits this SOF-authored value from Blue serialization, but it is
  // part of the editable plane description and must survive values exchange.
  @io.rebuild("packedGeometry")
  @io.persist
  @type.vec4
  blinkData = vec4.fromValues(1, 0, 1, 0);

  /**
   * Fills the caller-owned out box with the plane's unit box transformed by its
   * rotation, position and scaling.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon returns AxisAlignedBox by value; JavaScript fills a caller-supplied box3.")
  GetBounds(out)
  {
    // Carbon TransformationMatrix(scaling, rotation, position).
    const transform = mat4.fromRotationTranslationScale(
      EvePlaneSetItem.#transform,
      this.rotation,
      this.position,
      this.scaling
    );
    return box3.transformMat4(out, EvePlaneSetItem.#bounds, transform);
  }

  /** The parent bone this plane rides. */
  @carbon.method
  @impl.implemented
  GetBoneIndex()
  {
    return this.boneIndex;
  }

  static #bounds = box3.fromValues(-0.5, -0.5, -0.5, 0.5, 0.5, 0.5);

  static #transform = mat4.create();

  static #transformedBounds = box3.create();
}
