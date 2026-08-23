// Source: E:\carbonengine\trinity\trinity\Controllers\Actions\Tr2ActionSetAudioSwitch.h
// Source: E:\carbonengine\trinity\trinity\Controllers\Actions\Tr2ActionSetAudioSwitch.cpp
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { ITr2ControllerAction } from "./ITr2ControllerAction.js";


/**
 * Controller action that sets a Wwise switch group to a given state on a named
 * audio emitter when it starts.
 */
@type.define({
  className: "Tr2ActionSetAudioSwitch",
  family: "controllers"
})
export class Tr2ActionSetAudioSwitch extends CjsModel
{
  @io.persist
  @type.string
  emitter = "";

  @io.persist
  @type.string
  switchGroup = "";

  @io.persist
  @type.string
  switchState = "";

  /**
   * Sets a Wwise-style switch on a named emitter.
   */
  @carbon.method
  @impl.adapted
  Start(controller)
  {
    const emitter = ITr2ControllerAction.findSoundEmitter(ITr2ControllerAction.getOwner(controller), this.emitter);
    if (!ITr2ControllerAction.hasFunction(emitter, "SetSwitch"))
    {
      return;
    }
    emitter.SetSwitch(this.switchGroup, this.switchState);
  }

  /**
   * Starts manually with an explicit controller.
   */
  @carbon.method
  @impl.implemented
  StartWithController(controller)
  {
    this.Start(ITr2ControllerAction.requireController(controller, "StartWithController"));
  }
}
