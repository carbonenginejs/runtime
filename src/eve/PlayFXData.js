// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Children\Behaviors\PlayFX.h
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { type } from "@carbonenginejs/runtime-utils/schema";


/**
 * Per-agent scratch for the PlayFX child behaviour: whether the agent's effect
 * is currently running and the target position it was last aimed at. The
 * behaviour allocates one record per agent and rewrites it on every behaviour
 * update.
 */
@type.define({
  className: "PlayFXData",
  family: "eve/child/behaviors"
})
export class PlayFXData extends CjsModel
{
  @type.boolean
  effectPlaying = false;

  @type.boolean
  droneArrived = false;

  @type.vec3
  oldTarget = vec3.create();
}
