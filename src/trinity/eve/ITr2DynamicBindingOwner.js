import { IRoot } from "../../blue/blueexposure/IRoot.js";
// Source: trinity/trinity/ITr2DynamicBindingOwner.h:5-9
import { CjsSchema, meta } from "#schema";


/** Contract for an object that supplies named roots to dynamic bindings. */
export class ITr2DynamicBindingOwner extends IRoot
{
  /**
   * Returns the named object roots used to resolve dynamic binding paths.
   *
   * @abstract
   * @returns {Object<string, object>} The owner's parameter map.
   */

  GetParameterMap() {}
}

CjsSchema.decorateMethod(ITr2DynamicBindingOwner, "GetParameterMap", meta.abstract);
CjsSchema.exposure.inherit(IRoot)(ITr2DynamicBindingOwner);
CjsSchema.exposure.interface("ITr2DynamicBindingOwner")(ITr2DynamicBindingOwner);
