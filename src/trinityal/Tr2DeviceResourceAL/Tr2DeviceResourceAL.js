// Source: trinity/trinityal/Tr2DeviceResourceAL.h
import { CjsSchema, blue, meta } from "#schema";
import { Tr2BaseDeviceResourceAL } from "./Tr2BaseDeviceResourceAL.js";

/**
 * Forwards the resource registry interface to concrete backend resource methods.
 *
 * Carbon's CRTP cast selects the derived resource; JavaScript dispatches the
 * same IsValid and GetMemoryClass calls through this without a template.
 */
export class Tr2DeviceResourceAL extends Tr2BaseDeviceResourceAL
{
  /** Registered name; `constructor.name` does not survive minification. */
  static className = "Tr2DeviceResourceAL";

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

blue.inherit(Tr2BaseDeviceResourceAL)(Tr2DeviceResourceAL);
// States: Tr2DeviceResourceAL.h:40-48, which forward to the concrete class's IsValid and GetMemoryClass.
CjsSchema.decorateMethod(Tr2DeviceResourceAL, "IsResourceValid", meta.implemented);
CjsSchema.decorateMethod(Tr2DeviceResourceAL, "GetResourceMemoryClass", meta.implemented);
CjsSchema.meta.carbon("Tr2DeviceResourceAL")(Tr2DeviceResourceAL);
