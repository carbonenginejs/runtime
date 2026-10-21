import { meta } from "#schema";
// Source: trinity/trinity/Eve/SpaceObject/Children/Behaviors/Formation.h
import { type, blue } from "#schema";


/**
 * Per-agent scratch for the Formation child behaviour: the formation slot the
 * agent has been assigned, or -1 while it has none. The behaviour allocates one
 * record per agent and rewrites it on every behaviour update.
 */
@meta.carbon("FormationData")
export class FormationData
{
  @type.int32
  assignedSlot = -1;
}
