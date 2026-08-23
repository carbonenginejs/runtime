// Source: trinity/trinity/Controllers/Actions/Tr2ActionCallback.h
// Source: trinity/trinity/Controllers/Actions/Tr2ActionCallback.cpp
import { CjsModel } from "#model";
import { carbon, impl, io, type } from "#schema";


/**
 * Controller action that fires a named callback on its controller when the
 * action starts, letting host code hook a point in a state machine or timeline.
 */
@type.define({
  className: "Tr2ActionCallback",
  family: "controllers"
})
export class Tr2ActionCallback extends CjsModel
{
  @io.persist
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
