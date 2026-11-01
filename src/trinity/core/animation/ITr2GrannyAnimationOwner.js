import { IRoot } from "../../../blue/blueexposure/IRoot.js";
// Source: trinity/trinity/Tr2GrannyAnimation.h:31-35
import { CjsSchema, meta } from "#schema";


/** Contract for an object that owns a Granny animation controller. */
export class ITr2GrannyAnimationOwner extends IRoot
{

  /**
   * The owned animation controller (h:34).
   *
   * @abstract
   * @returns {Tr2GrannyAnimation|null}
   */
  GetAnimationController()
  {
  }
}

CjsSchema.decorateMethod(ITr2GrannyAnimationOwner, "GetAnimationController", meta.abstract);
CjsSchema.exposure.inherit(IRoot)(ITr2GrannyAnimationOwner);
CjsSchema.exposure.interface("ITr2GrannyAnimationOwner")(ITr2GrannyAnimationOwner);
