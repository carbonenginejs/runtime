import { IRoot } from "../../../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObject/Attachments/IEveSpaceObjectDecalOwner.h
import { CjsSchema, blue } from "#schema";


/** Contract for an object that owns space-object decals (h:7-11). */
export class IEveSpaceObjectDecalOwner
{

  /**
   * Adds one decal (h:10).
   * @param {EveSpaceObjectDecal} _newDecal
   */
  AddDecal(_newDecal)
  {
  }
}

CjsSchema.decorateMethod(IEveSpaceObjectDecalOwner, "AddDecal", blue.abstract);
CjsSchema.blue.inherit(IRoot)(IEveSpaceObjectDecalOwner);
CjsSchema.exposure.interface("IEveSpaceObjectDecalOwner")(IEveSpaceObjectDecalOwner);
