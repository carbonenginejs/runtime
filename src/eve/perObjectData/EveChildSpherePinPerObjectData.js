// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Children\EveChildSpherePin.h
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { quat } from "@carbonenginejs/runtime-utils/quat";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { type } from "@carbonenginejs/runtime-utils/schema";


@type.define({
  className: "EveChildSpherePinPerObjectData",
  family: "eve/perObjectData"
})
export class EveChildSpherePinPerObjectData extends CjsModel
{
  @type.mat4
  worldMatrix = mat4.create();

  @type.vec4
  pinPosition = vec4.create();

  @type.quat
  pinRotation = quat.create();

  @type.color
  pinColor = vec4.create();

  @type.vec4
  pinThreshold = vec4.create();

  @type.vec4
  pinRadiusPrecalc = vec4.create();

  @type.vec4
  pinUV = vec4.create();
}
