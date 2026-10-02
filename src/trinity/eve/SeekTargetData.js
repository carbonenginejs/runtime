// Source: trinity/trinity/Eve/SpaceObject/Children/Behaviors/SeekTarget.h
import { vec3 } from "#math/vec3";
import { meta } from "#schema";


/**
 * Per-agent scratch for the SeekTarget child behaviour: the locator being
 * sought, the position and direction of the approach, and whether the agent has
 * spawned and arrived. The behaviour allocates one record per agent and rewrites
 * it on every behaviour update.
 */
@meta.define({
  className: "SeekTargetData",
  family: "eve/child/behaviors"
})
export class SeekTargetData
{
  @meta.type.int32
  bucketId = -1;

  @meta.type.int32
  locatorIndex = -1;

  @meta.type.float32
  timePassed = 0;

  @meta.type.vec3
  position = vec3.create();

  @meta.type.vec3
  direction = vec3.create();

  @meta.type.boolean
  arrived = true;

  @meta.type.boolean
  hasSpawned = false;
}
