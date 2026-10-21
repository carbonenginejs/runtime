import { meta } from "#schema";
// Source: trinity/trinity/Eve/SpaceObject/Children/Behaviors/PlayFX.h
import { vec3 } from "#math/vec3";
import { type, blue } from "#schema";


/**
 * Per-agent scratch for the PlayFX child behaviour: whether the agent's effect
 * is currently running and the target position it was last aimed at. The
 * behaviour allocates one record per agent and rewrites it on every behaviour
 * update.
 */
@meta.carbon("PlayFXData")
export class PlayFXData
{
  @type.boolean
  effectPlaying = false;

  @type.boolean
  droneArrived = false;

  @type.vec3
  oldTarget = vec3.create();
}
