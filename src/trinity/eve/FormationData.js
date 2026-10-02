// Source: trinity/trinity/Eve/SpaceObject/Children/Behaviors/Formation.h
import { meta } from "#schema";


/**
 * Per-agent scratch for the Formation child behaviour: the formation slot the
 * agent has been assigned, or -1 while it has none. The behaviour allocates one
 * record per agent and rewrites it on every behaviour update.
 */
@meta.define({
  className: "FormationData",
  family: "eve/child/behaviors"
})
export class FormationData
{
  @meta.type.int32
  assignedSlot = -1;
}
