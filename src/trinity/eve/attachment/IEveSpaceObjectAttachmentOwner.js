import { IRoot } from "../../../blue/blueexposure/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/IEveSpaceObjectAttachmentOwner.h
import { CjsSchema, meta } from "#schema";


/** Contract for an object that owns space-object attachments (h:7-12). */
export class IEveSpaceObjectAttachmentOwner extends IRoot
{

  /**
   * Adds one attachment (h:10).
   *
   * @abstract
   * @param {IEveSpaceObjectAttachment} _attachment
   */
  AddAttachment(_attachment)
  {
  }

  /**
   * Removes every attachment (h:11).
   *
   * @abstract
   */
  ClearAttachments()
  {
  }
}

CjsSchema.decorateMethod(IEveSpaceObjectAttachmentOwner, "AddAttachment", meta.abstract);
CjsSchema.decorateMethod(IEveSpaceObjectAttachmentOwner, "ClearAttachments", meta.abstract);
CjsSchema.exposure.inherit(IRoot)(IEveSpaceObjectAttachmentOwner);
CjsSchema.exposure.interface("IEveSpaceObjectAttachmentOwner")(IEveSpaceObjectAttachmentOwner);
