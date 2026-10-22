import { IRoot } from "../../../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObject/Attachments/IEveSpaceObjectDecalOwner.h
import { CjsSchema, meta } from "#schema";


/** Contract for an object that owns space-object decals (h:7-11). */
export class IEveSpaceObjectDecalOwner extends IRoot
{

  /**
   * Adds one decal (h:10).
   * @param {EveSpaceObjectDecal} _newDecal
   */
  AddDecal(_newDecal)
  {
  }
}

CjsSchema.decorateMethod(IEveSpaceObjectDecalOwner, "AddDecal", meta.abstract);
CjsSchema.exposure.inherit(IRoot)(IEveSpaceObjectDecalOwner);
CjsSchema.exposure.interface("IEveSpaceObjectDecalOwner")(IEveSpaceObjectDecalOwner);
