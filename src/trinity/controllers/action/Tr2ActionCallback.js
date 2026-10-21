import { CjsSchema } from "#schema";
import { exposure as be } from "#be";
// Source: trinity/trinity/Controllers/Actions/Tr2ActionCallback.h
// Source: trinity/trinity/Controllers/Actions/Tr2ActionCallback.cpp
// Source: trinity/trinity/Controllers/Actions/Tr2ActionCallback_Blue.cpp
import { ITr2ControllerAction } from "./ITr2ControllerAction.js";
import { meta, type, blue } from "#schema";


/**
 * Controller action that fires a named callback on its controller when the
 * action starts, letting host code hook a point in a state machine or timeline.
 */
@be.define("Tr2ActionCallback")
export class Tr2ActionCallback extends ITr2ControllerAction
{
  /**
   * Name of the controller callback invoked when this action starts.
   * @type {string}
   */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  callbackName = "";

  /**
   * Notifies the linked controller callback registry.
   */
  @blue.method
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
CjsSchema.exposure.mapInterface(ITr2ControllerAction)(Tr2ActionCallback);
