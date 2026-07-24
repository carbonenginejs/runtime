// Source: E:\carbonengine\trinity\trinity\Eve\EveConstantBufferFormats.h
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { type } from "@carbonenginejs/runtime-utils/schema";


@type.define({
  className: "EvePerObjectVSData",
  family: "eve"
})
export class EvePerObjectVSData extends CjsModel
{
  @type.mat4
  WorldMat = mat4.create();
}
