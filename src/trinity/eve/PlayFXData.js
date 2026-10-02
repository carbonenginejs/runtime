// Source: trinity/trinity/Eve/SpaceObject/Children/Behaviors/PlayFX.h
import { vec3 } from "#math/vec3";
import { meta } from "#schema";


/**
 * Per-agent scratch for the PlayFX child behaviour: whether the agent's effect
 * is currently running and the target position it was last aimed at. The
 * behaviour allocates one record per agent and rewrites it on every behaviour
 * update.
 */
@meta.define({
  className: "PlayFXData",
  family: "eve/child/behaviors"
})
export class PlayFXData
{
  @meta.type.boolean
  effectPlaying = false;

  @meta.type.boolean
  droneArrived = false;

  @meta.type.vec3
  oldTarget = vec3.create();
}
