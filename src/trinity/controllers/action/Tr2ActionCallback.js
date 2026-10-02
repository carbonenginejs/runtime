// Source: trinity/trinity/Controllers/Actions/Tr2ActionCallback.h
// Source: trinity/trinity/Controllers/Actions/Tr2ActionCallback.cpp
// Source: trinity/trinity/Controllers/Actions/Tr2ActionCallback_Blue.cpp
import { ITr2ControllerAction } from "./ITr2ControllerAction.js";
import { meta } from "#schema";


/**
 * Controller action that fires a named callback on its controller when the
 * action starts, letting host code hook a point in a state machine or timeline.
 */
@meta.define({
  className: "Tr2ActionCallback",
  family: "controllers"
})
export class Tr2ActionCallback extends ITr2ControllerAction
{
  /**
   * Name of the controller callback invoked when this action starts.
   * @type {string}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  callbackName = "";

  /**
   * Notifies the linked controller callback registry.
   */
  @meta.blue.method
  @meta.implemented
  Start(controller)
  {
    if (this.callbackName)
    {
      controller.Callback(this.callbackName);
    }
  }
}

// Native exposure ends at this concrete table (Tr2ActionCallback_Blue.cpp:12-13,20).
meta.blue.interfaceTable({
  interfaces: [Tr2ActionCallback, ITr2ControllerAction],
  chainTo: null
})(Tr2ActionCallback);
