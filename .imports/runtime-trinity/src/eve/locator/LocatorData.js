// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Children\Behaviors\SeekTarget.h
import { quat } from "@carbonenginejs/runtime-utils/quat";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { type } from "@carbonenginejs/runtime-utils/schema";


/** Position and orientation pair handed to seek-target child behaviours. */
@type.define({
  className: "LocatorData",
  family: "eve/child/behaviors"
})
export class LocatorData extends CjsModel
{
  @type.vec3
  position = vec3.create();

  @type.quat
  direction = quat.create();
}
