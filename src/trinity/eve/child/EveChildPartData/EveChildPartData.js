// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildPartData.h
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildPartData.cpp
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildPartData_Blue.cpp
import { type, blue } from "#schema";
import { IEveSpaceObjectChild } from "../IEveSpaceObjectChild.js";

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
@blue.define("EveChildPartData")
@blue.interface(EveSpaceObjectChild, IEveSpaceObjectChild)
@blue.chainTo(EveSpaceObjectChild)
export class EveChildPartData extends EveSpaceObjectChild
{
  @blue.persist
  @type.string
  faction = "";

  @blue.persist
  @type.string
  race = "";

  @blue.persist
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

// EveChildPartData_Blue.cpp: native exposure.
