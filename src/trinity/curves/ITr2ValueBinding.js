// Source: trinity/trinity/Include/ITr2ValueBinding.h:7-11
import { CjsSchema, meta } from "#schema";


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

CjsSchema.decorateMethod(ITr2ValueBinding, "CopyValue", meta.compose.abstract, meta.impl.abstract);
CjsSchema.define(ITr2ValueBinding, {
  className: "ITr2ValueBinding", carbon: "ITr2ValueBinding", family: "curves", fields: {}
});
