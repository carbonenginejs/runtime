// Source: trinity/trinity/Eve/SpaceObject/Children/Behaviors/ProcessLifetime.h
import { CjsModel } from "#model";
import { type } from "#schema";


/**
 * Per-agent scratch record for the ProcessLifetime behavior: which tunnel the
 * agent is assigned, how far along that tunnel it is, and whether it has spawned
 * or already used its entry and exit tunnels.
 */
@type.define({
  className: "ProcessLifetimeData",
  family: "eve"
})
export class ProcessLifetimeData extends CjsModel
{
  @type.boolean
  hasUsedEntryTunnel = false;

  @type.boolean
  hasUsedExitTunnel = false;

  @type.int32
  assignedLifeTimeTunnel = 0;

  @type.int32
  tunnelPoint = 0;

  @type.boolean
  hasSpawned = false;
}
