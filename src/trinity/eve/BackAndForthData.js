// Source: trinity/trinity/Eve/SpaceObject/Children/Behaviors/BackAndForth.h
import { vec3 } from "#math/vec3";
import { meta } from "#schema";


/**
 * Per-agent scratch for the BackAndForth child behaviour: the locator the agent
 * is travelling to, the direction it approaches from, and how far through the
 * trip it is. The behaviour allocates one record per agent and rewrites it on
 * every behaviour update.
 */
@meta.define({
  className: "BackAndForthData",
  family: "eve/child/behaviors"
})
export class BackAndForthData
{
  @meta.type.vec3
  locatorTarget = vec3.create();

  @meta.type.vec3
  locatorDirection = vec3.create();

  @meta.type.int32
  locatorIndex = -1;

  @meta.type.boolean
  seek = true;

  @meta.type.boolean
  deliver = false;

  @meta.type.boolean
  arrived = true;

  @meta.type.float32
  timePassed = 0;
}
