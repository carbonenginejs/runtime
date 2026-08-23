// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Children\Behaviors\FollowASpline.h
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { type } from "@carbonenginejs/runtime-utils/schema";


/**
 * Per-agent scratch for the FollowASpline child behaviour: which tunnel the
 * agent is locked onto and which point along it the agent is heading for. The
 * behaviour allocates one record per agent and rewrites it on every behaviour
 * update.
 */
@type.define({
  className: "FollowASplineData",
  family: "eve/child/behaviors"
})
export class FollowASplineData extends CjsModel
{
  @type.int32
  tunnelLock = -1;

  @type.int32
  tunnelPoint = 0;
}
