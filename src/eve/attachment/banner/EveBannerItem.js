// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Attachments\Sets\EveBannerSet.h
// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Attachments\Sets\EveBannerSet.cpp
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { quat } from "@carbonenginejs/runtime-utils/quat";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { io, type } from "@carbonenginejs/runtime-utils/schema";


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
}
