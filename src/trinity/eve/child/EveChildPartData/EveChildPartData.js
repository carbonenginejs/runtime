// Carbon source: trinity/trinity/Eve/SpaceObject/Children/EveChildPartData.h
// Carbon source: trinity/trinity/Eve/SpaceObject/Children/EveChildPartData.cpp
// Carbon source: trinity/trinity/Eve/SpaceObject/Children/EveChildPartData_Blue.cpp
import { io, type } from "#schema";
import { EveSpaceObjectChild } from "../EveSpaceObjectChild.js";
import { EveChildPartDataPartData } from "./EveChildPartDataPartData.js";


/**
 * Persistent modular-space-object state stored as an effect child.
 *
 * Carbon's header declares these members persistent, but its current Blue
 * exposure maps only the child interfaces. The explicit persistence metadata
 * below is the JavaScript adaptation required for the documented state to
 * survive a model values round trip.
 */
@type.define({ className: "EveChildPartData", family: "eve/child" })
export class EveChildPartData extends EveSpaceObjectChild
{
  @io.persist
  @type.string
  faction = "";

  @io.persist
  @type.string
  race = "";

  @io.persist
  @type.list("EveChildPartData.PartData")
  parts = [];

  /** Returns the first monotonically available positive Carbon part tag. */
  GetUnusedPartID()
  {
    let nextId = 1;

    for (const part of this.parts)
    {
      const candidate = ((Number(part.partId) >>> 0) + 1) >>> 0;
      nextId = Math.max(nextId, candidate);
    }

    return nextId >>> 0;
  }

  static PartData = EveChildPartDataPartData;
}
