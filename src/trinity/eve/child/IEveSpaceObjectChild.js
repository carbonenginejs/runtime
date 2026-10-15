// Source: trinity/trinity/Eve/SpaceObject/Children/IEveSpaceObjectChild.h
import { blue } from "#schema";
import { Origin } from "../../generated/eve/child/enums.js";
import { EveEntity } from "../EveEntity.js";


/**
 * Deprecated compatibility identity retained for older serialized and Python
 * type names. New code uses EveSpaceObjectChild.
 *
 * @deprecated Use EveSpaceObjectChild.
 */
@blue.define("IEveSpaceObjectChild")
export class IEveSpaceObjectChild extends EveEntity
{
  static Origin = Origin;

}
