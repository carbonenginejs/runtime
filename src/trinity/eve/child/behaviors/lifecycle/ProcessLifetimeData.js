// Source: trinity/trinity/Eve/SpaceObject/Children/Behaviors/ProcessLifetime.h
import { meta } from "#schema";


/**
 * Per-agent scratch record for the ProcessLifetime behavior: which tunnel the
 * agent is assigned, how far along that tunnel it is, and whether it has spawned
 * or already used its entry and exit tunnels.
 */
@meta.define({
  className: "ProcessLifetimeData",
  family: "eve"
})
export class ProcessLifetimeData
{
  @meta.type.boolean
  hasUsedEntryTunnel = false;

  @meta.type.boolean
  hasUsedExitTunnel = false;

  @meta.type.int32
  assignedLifeTimeTunnel = 0;

  @meta.type.int32
  tunnelPoint = 0;

  @meta.type.boolean
  hasSpawned = false;
}
