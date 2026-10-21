import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/ITr2DynamicBindingOwner.h:5-9
import { CjsSchema, meta, blue } from "#schema";


/** Contract for an object that supplies named roots to dynamic bindings. */
export class ITr2DynamicBindingOwner
{
  /**
   * Returns the named object roots used to resolve dynamic binding paths.
   * @returns {Object<string, object>} The owner's parameter map.
   */
  @blue.method
  GetParameterMap() {}
}

CjsSchema.decorateMethod(ITr2DynamicBindingOwner, "GetParameterMap", meta.abstract);
CjsSchema.blue.inherit(IRoot)(ITr2DynamicBindingOwner);
CjsSchema.exposure.interface("ITr2DynamicBindingOwner")(ITr2DynamicBindingOwner);
