import { meta } from "#schema";
// Source: trinity/trinity/Eve/SpaceObject/Children/Behaviors/ProcessLifetime.h
import { type, blue } from "#schema";


/**
 * Per-agent scratch record for the ProcessLifetime behavior: which tunnel the
 * agent is assigned, how far along that tunnel it is, and whether it has spawned
 * or already used its entry and exit tunnels.
 */
@meta.carbon("ProcessLifetimeData")
export class ProcessLifetimeData
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
