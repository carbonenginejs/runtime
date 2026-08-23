// Source: trinity/trinity/Eve/SpaceObject/Children/Behaviors/Inertia.h
import { vec3 } from "#math/vec3";
import { CjsModel } from "#model";
import { type } from "#schema";


/**
 * Per-agent scratch for the Inertia child behaviour: the acceleration carried
 * over from the previous update and the weight it is blended in with. The
 * behaviour allocates one record per agent and rewrites it on every behaviour
 * update.
 */
@type.define({
  className: "InertiaData",
  family: "eve/child/behaviors"
})
export class InertiaData extends CjsModel
{
  @type.vec3
  agentAccel = vec3.create();

  @type.float32
  inertiaWeight = 0;
}
