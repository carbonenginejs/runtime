// Source: trinity/trinity/Eve/SpaceObject/Children/Behaviors/SeekTarget.h
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { meta } from "#schema";


/** Position and orientation pair handed to seek-target child behaviours. */
@meta.define({
  className: "LocatorData",
  family: "eve/child/behaviors"
})
export class LocatorData
{
  @meta.type.vec3
  position = vec3.create();

  @meta.type.quat
  direction = quat.create();
}
