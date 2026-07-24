// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Attachments\Sets\EvePlaneSetItem.h
// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Attachments\Sets\EvePlaneSetItem.cpp
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { quat } from "@carbonenginejs/runtime-utils/quat";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { io, type } from "@carbonenginejs/runtime-utils/schema";


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
}
