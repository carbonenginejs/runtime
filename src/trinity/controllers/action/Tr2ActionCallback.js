// Source: trinity/trinity/Controllers/Actions/Tr2ActionCallback.h
// Source: trinity/trinity/Controllers/Actions/Tr2ActionCallback.cpp
import { CjsModel } from "#model";
import { ITr2ControllerAction } from "./ITr2ControllerAction.js";
import { carbon, impl, edit, type } from "#schema";


/**
 * Controller action that fires a named callback on its controller when the
 * action starts, letting host code hook a point in a state machine or timeline.
 */
@type.define({
  className: "Tr2ActionCallback",
  family: "controllers"
})
@carbon.inherit(ITr2ControllerAction)
export class Tr2ActionCallback extends CjsModel
{
  @edit.readwrite
  @edit.persist
  @type.string
  callbackName = "";

  /**
   * Notifies the linked controller callback registry.
   */
  @carbon.method
  @impl.implemented
  Start(controller)
  {
    if (this.callbackName)
    {
      controller.Callback?.(this.callbackName);
    }
  }
}
