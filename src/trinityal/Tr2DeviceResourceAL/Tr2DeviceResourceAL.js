// Source: trinity/trinityal/Tr2DeviceResourceAL.h
import { Tr2BaseDeviceResourceAL } from "./Tr2BaseDeviceResourceAL.js";

/**
 * Forwards the resource registry interface to concrete backend resource methods.
 *
 * Carbon's CRTP cast selects the derived resource; JavaScript dispatches the
 * same IsValid and GetMemoryClass calls through this without a template.
 */
export class Tr2DeviceResourceAL extends Tr2BaseDeviceResourceAL
{
  /** @returns {boolean} Whether the concrete resource is valid. */
  IsResourceValid()
  {
    return this.IsValid();
  }

  /** @returns {number} The concrete resource's Tr2ALMemoryType. */
  GetResourceMemoryClass()
  {
    return this.GetMemoryClass();
  }
}
