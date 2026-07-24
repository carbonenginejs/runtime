// Source: E:\carbonengine\trinity\trinity\Eve\EveTransform.h
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { type } from "@carbonenginejs/runtime-utils/schema";


@type.define({
  className: "EveBasicPerObjectData",
  family: "eve/perObjectData"
})
export class EveBasicPerObjectData extends CjsModel
{
  @type.mat4
  world = mat4.create();

  @type.mat4
  worldLast = mat4.create();

  @type.mat4
  worldInverse = mat4.create();
}
