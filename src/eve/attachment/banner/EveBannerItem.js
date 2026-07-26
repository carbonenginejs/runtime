// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Attachments\Sets\EveBannerSet.h
// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Attachments\Sets\EveBannerSet.cpp
import { box3 } from "@carbonenginejs/runtime-utils/box3";
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { quat } from "@carbonenginejs/runtime-utils/quat";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";


// Carbon persists banners as a raw structure list (BLUE_DECLARE_STRUCTURE_LIST
// on EveBannerSet.banners, READ | PERSIST), so every geometric field below
// round-trips.
@type.define({ className: "EveBannerItem", family: "eve/attachment/banners" })
export class EveBannerItem extends CjsModel
{
  @io.rebuild("packedGeometry")
  @io.persist
  @type.int32
  bone = -1;

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
  angleX = 0;

  @io.rebuild("packedGeometry")
  @io.persist
  @type.float32
  angleY = 0;

  // Carbon keeps this as private structure metadata, but SOF-authored banner
  // identity is part of the editable description in CarbonEngineJS.
  @io.persist
  @type.int32
  reference = 0;

  /** Carbon builds this inline in EveBannerSet::Rebuild (cpp:417-419): the
   * authored box is HALF-OPEN in z - (-0.5, -0.5, -0.5) to (0.5, 0.5, 0) - so a
   * banner bounds its own face and the depth behind it, not in front. Carbon
   * (row-vector) composes TransformationMatrix(scaling, rotation, position). */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon inlines the per-banner box inside the set rebuild; the port moves it onto the item so the shared item-set builder can read it.")
  GetBounds(out)
  {
    const transform = mat4.fromRotationTranslationScale(
      EveBannerItem.#transform,
      this.rotation,
      this.position,
      this.scaling
    );
    return box3.transformMat4(out, EveBannerItem.#bounds, transform);
  }

  /** Carbon reads the item member directly (cpp:424); the item-set builder
   * needs the accessor every other set item already has. */
  @carbon.method
  @impl.adapted
  @impl.reason("Accessor for the shared item-set bounds builder; Carbon reads jt->bone directly.")
  GetBoneIndex()
  {
    return this.bone;
  }

  static #bounds = box3.fromValues(-0.5, -0.5, -0.5, 0.5, 0.5, 0);

  static #transform = mat4.create();
}
