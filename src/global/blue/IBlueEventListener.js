// Source: blue/include/IBlueEventListener.h:7-10
// Source: blue/src/IBlueEventListener_Blue.cpp:6
import { CjsSchema, meta } from "#schema";


/**
 * Receives named events from other subsystems. Carbon derives this interface
 * from IRoot; the shared JavaScript contract follows Blue's plain-class convention.
 */
export class IBlueEventListener
{
  /**
   * Handles an event delivered to this listener.
   * Native signature: void HandleEvent(const wchar_t* evtName) = 0.
   * @param {string} _eventName The event name; JavaScript strings retain the native wide-string content.
   * @returns {void}
   */
  HandleEvent(_eventName)
  {
  }
}

CjsSchema.decorateMethod(IBlueEventListener, "HandleEvent", meta.requires, meta.abstract);
// Carbon defines an IID, not a class factory. JavaScript registers the interface
// constructor so named declarations and nominal composition resolve one identity.
CjsSchema.define(IBlueEventListener, {
  className: "IBlueEventListener", carbon: "IBlueEventListener", family: "blue", fields: {}
});
