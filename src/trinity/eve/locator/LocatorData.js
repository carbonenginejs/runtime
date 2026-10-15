// Source: trinity/trinity/Eve/SpaceObject/Children/Behaviors/SeekTarget.h
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { type, blue } from "#schema";


/** Position and orientation pair handed to seek-target child behaviours. */
@blue.define("LocatorData")
export class LocatorData
{
  @type.vec3
  position = vec3.create();

  @type.quat
  direction = quat.create();
}
