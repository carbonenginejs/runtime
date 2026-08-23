// Source: trinity/trinity/Eve/UI/EveLineSet.h
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { CjsModel } from "#model";
import { type } from "#schema";


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
