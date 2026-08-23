// Source: trinity/trinity/Eve/SpaceObject/Children/Behaviors/SeekTarget.h
import { vec3 } from "#math/vec3";
import { CjsModel } from "#model";
import { type } from "#schema";


/**
 * Per-agent scratch for the SeekTarget child behaviour: the locator being
 * sought, the position and direction of the approach, and whether the agent has
 * spawned and arrived. The behaviour allocates one record per agent and rewrites
 * it on every behaviour update.
 */
@type.define({
  className: "SeekTargetData",
  family: "eve/child/behaviors"
})
export class SeekTargetData extends CjsModel
{
  @type.int32
  bucketId = -1;

  @type.int32
  locatorIndex = -1;

  @type.float32
  timePassed = 0;

  @type.vec3
  position = vec3.create();

  @type.vec3
  direction = vec3.create();

  @type.boolean
  arrived = true;

  @type.boolean
  hasSpawned = false;
}
