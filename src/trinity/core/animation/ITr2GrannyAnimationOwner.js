import { IRoot } from "../../../global/blue/IRoot.js";
// Source: trinity/trinity/Tr2GrannyAnimation.h:31-35
import { CjsSchema, blue } from "#schema";


/** Contract for an object that owns a Granny animation controller. */
export class ITr2GrannyAnimationOwner extends IRoot
{

  /**
   * The owned animation controller (h:34).
   * @returns {Tr2GrannyAnimation|null}
   */
  GetAnimationController()
  {
  }
}

CjsSchema.decorateMethod(ITr2GrannyAnimationOwner, "GetAnimationController", blue.abstract);
CjsSchema.blue.inherit(IRoot)(ITr2GrannyAnimationOwner);
CjsSchema.exposure.interface("ITr2GrannyAnimationOwner")(ITr2GrannyAnimationOwner);
