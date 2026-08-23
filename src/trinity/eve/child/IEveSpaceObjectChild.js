// Source: trinity/trinity/Eve/SpaceObject/Children/IEveSpaceObjectChild.h
import { type } from "#schema";
import { Origin } from "../../generated/eve/child/enums.js";
import { EveEntity } from "../EveEntity.js";


/**
 * Deprecated compatibility identity retained for older serialized and Python
 * type names. New code uses EveSpaceObjectChild.
 *
 * @deprecated Use EveSpaceObjectChild.
 */
@type.define({ className: "IEveSpaceObjectChild", family: "eve/child" })
export class IEveSpaceObjectChild extends EveEntity
{
  static Origin = Origin;

}
