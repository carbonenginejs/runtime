import { meta } from "#schema";
// Source: trinity/trinity/Eve/SpaceObject/Children/Behaviors/FollowASpline.h
import { type, blue } from "#schema";


/**
 * Per-agent scratch for the FollowASpline child behaviour: which tunnel the
 * agent is locked onto and which point along it the agent is heading for. The
 * behaviour allocates one record per agent and rewrites it on every behaviour
 * update.
 */
@meta.carbon("FollowASplineData")
export class FollowASplineData
{
  @type.int32
  tunnelLock = -1;

  @type.int32
  tunnelPoint = 0;
}
