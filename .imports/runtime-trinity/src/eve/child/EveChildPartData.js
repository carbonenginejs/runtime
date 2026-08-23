// Carbon source: trinity/trinity/Eve/SpaceObject/Children/EveChildPartData.h
// Carbon source: trinity/trinity/Eve/SpaceObject/Children/EveChildPartData.cpp
// Carbon source: trinity/trinity/Eve/SpaceObject/Children/EveChildPartData_Blue.cpp
import { quat } from "@carbonenginejs/runtime-utils/quat";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { EveSpaceObjectChild } from "./EveSpaceObjectChild.js";


/**
 * One modular-object part's logical transform and local-space bounds.
 *
 * Carbon declares this as EveChildPartData::PartData. The JavaScript class is
 * exported under a legal identifier while retaining that nested schema name.
 */
@type.define({ className: "EveChildPartData.PartData", family: "eve/child" })
export class EveChildPartDataPartData extends CjsModel
{
  @io.persist
  @type.uint32
  partId = 0;

  @io.persist
  @type.vec3
  position = vec3.create();

  @io.persist
  @type.quat
  rotation = quat.create();

  @io.persist
  @type.vec3
  scale = vec3.fromValues(1, 1, 1);

  /** Packed CcpMath::Sphere: xyz center and w radius. */
  @io.persist
  @type.vec4
  boundingSphere = vec4.create();
}


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
