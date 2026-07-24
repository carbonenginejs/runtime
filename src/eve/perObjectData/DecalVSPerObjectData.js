// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Attachments\EveSpaceObjectDecal.h
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { type } from "@carbonenginejs/runtime-utils/schema";


@type.define({
  className: "DecalVSPerObjectData",
  family: "eve/perObjectData"
})
export class DecalVSPerObjectData extends CjsModel
{
  @type.mat4
  worldMatrix = mat4.create();

  @type.mat4
  invWorldMatrix = mat4.create();

  @type.mat4
  decalMatrix = mat4.create();

  @type.mat4
  inverseDecalMatrix = mat4.create();

  @type.mat4
  parentBoneMatrix = mat4.create();

  @type.mat4
  invParentBoneMatrix = mat4.create();
}
