// Source: E:\carbonengine\trinity\trinity\Eve\UI\EveLineSet.h
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { type } from "@carbonenginejs/runtime-utils/schema";


/** One line in an EveLineSet: two endpoints, each with its own colour. */
@type.define({
  className: "EveLineData",
  family: "eve/ui"
})
export class EveLineData extends CjsModel
{
  @type.vec3
  position1 = vec3.create();

  @type.color
  color1 = vec4.create();

  @type.vec3
  position2 = vec3.create();

  @type.color
  color2 = vec4.create();
}
