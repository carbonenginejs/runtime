import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Include/ITr2ValueBinding.h:7-11
import { CjsSchema, blue } from "#schema";


/**
 * Contract for applying a value binding. Carbon derives this interface from
 * IRoot; JavaScript uses a plain registered interface without model behavior.
 */
export class ITr2ValueBinding
{
  /**
   * Copies the bound value to its destination.
   * Native signature: void CopyValue() = 0.
   * @returns {void}
   */
  CopyValue()
  {
  }
}

CjsSchema.decorateMethod(ITr2ValueBinding, "CopyValue", blue.abstract);
CjsSchema.blue.inherit(IRoot)(ITr2ValueBinding);
CjsSchema.blue.define(ITr2ValueBinding, {
  className: "ITr2ValueBinding",
  fields: {}
});
