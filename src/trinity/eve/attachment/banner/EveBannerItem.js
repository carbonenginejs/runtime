// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveBannerSet.h
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveBannerSet.cpp
import { box3 } from "#math/box3";
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { meta, type, blue } from "#schema";


// Carbon persists banners as a raw structure list (BLUE_DECLARE_STRUCTURE_LIST
// on EveBannerSet.banners, READ | PERSIST), so every geometric field below
// round-trips.

/**
 * One authored banner quad: its bone attachment, placement, the two curvature
 * angles that bend it, and the SOF reference id identifying which banner is
 * shown.
 * Native 64-bit size 56; offsets and storage types: trinity/trinity/
 * Eve/SpaceObject/Attachments/Sets/EveBannerSet.h:16-28; Eve/SpaceObject/Attachments/Sets/EveBannerSet.cpp:22-30 (reference storage is not exposed).
 */
@blue.define("EveBannerItem")
@meta.struct.define({ size: 56 })
export class EveBannerItem
{

  @blue.persist
  @meta.struct.INT32_1(0)
  bone = -1;

  @blue.persist
  @meta.struct.FLOAT32_3(4)
  position = vec3.create();

  @blue.persist
  @meta.struct.FLOAT32_4(16)
  @type.quat
  rotation = quat.create();

  @blue.persist
  @meta.struct.FLOAT32_3(32)
  scaling = vec3.fromValues(1, 1, 1);

  @blue.persist
  @meta.struct.FLOAT32_1(44)
  angleX = 0;

  @blue.persist
  @meta.struct.FLOAT32_1(48)
  angleY = 0;

  // Carbon keeps this as private structure metadata, but SOF-authored banner
  // identity is part of the editable description in CarbonEngineJS.
  @meta.persist
  @type.int32
  reference = 0;

  /**
   * Carbon builds this inline in EveBannerSet::Rebuild (cpp:417-419): the
   * authored box is HALF-OPEN in z - (-0.5, -0.5, -0.5) to (0.5, 0.5, 0) - so a
   * banner bounds its own face and the depth behind it, not in front. Carbon
   * (row-vector) composes TransformationMatrix(scaling, rotation, position).
   *
   * Adapted: Carbon inlines the per-banner box inside the set rebuild; the port moves it
   * onto the item so the shared item-set builder can read it.
   */
  @meta.adapted
  GetBounds(out)
  {
    const transform = mat4.fromRotationTranslationScale(
      EveBannerItem._transform,
      this.rotation,
      this.position,
      this.scaling
    );
    return box3.transformMat4(out, EveBannerItem._bounds, transform);
  }

  /**
   * Carbon reads the item member directly (cpp:424); the item-set builder
   * needs the accessor every other set item already has.
   *
   * Adapted: Accessor for the shared item-set bounds builder; Carbon reads jt->bone
   * directly.
   */
  @meta.adapted
  GetBoneIndex()
  {
    return this.bone;
  }

  static _bounds = box3.fromValues(-0.5, -0.5, -0.5, 0.5, 0.5, 0);

  static _transform = mat4.create();
}
