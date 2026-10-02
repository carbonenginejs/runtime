// Source: trinity/trinity/Eve/SpaceObject/Children/Behaviors/FollowASpline.h
import { meta } from "#schema";


/**
 * Per-agent scratch for the FollowASpline child behaviour: which tunnel the
 * agent is locked onto and which point along it the agent is heading for. The
 * behaviour allocates one record per agent and rewrites it on every behaviour
 * update.
 */
@meta.define({
  className: "FollowASplineData",
  family: "eve/child/behaviors"
})
export class FollowASplineData
{
  @meta.type.int32
  tunnelLock = -1;

  @meta.type.int32
  tunnelPoint = 0;
}
