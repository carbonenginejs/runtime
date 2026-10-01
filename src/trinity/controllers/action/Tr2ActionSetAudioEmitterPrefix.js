// Source: trinity/trinity/Controllers/Actions/Tr2ActionSetAudioEmitterPrefix.h
// Source: trinity/trinity/Controllers/Actions/Tr2ActionSetAudioEmitterPrefix.cpp
// Source: trinity/trinity/Controllers/Actions/Tr2ActionSetAudioEmitterPrefix_Blue.cpp
import { CjsModel } from "#model";
import { carbon, impl, edit, type } from "#schema";
import { ITr2ControllerAction } from "./ITr2ControllerAction.js";


/**
 * Controller action that sets the event-name prefix on a named audio emitter
 * when it starts, changing which bank events later sounds resolve to.
 */
@type.define({
  className: "Tr2ActionSetAudioEmitterPrefix",
  family: "controllers"
})
@carbon.inherit(ITr2ControllerAction)
export class Tr2ActionSetAudioEmitterPrefix extends CjsModel
{
  @edit.readwrite
  @edit.persist
  @type.string
  emitter = "";

  @edit.readwrite
  @edit.persist
  @type.string
  prefix = "";

  /**
   * Sets the prefix on a named audio emitter.
   */
  @carbon.method
  @impl.adapted
  Start(controller)
  {
    const emitter = ITr2ControllerAction.findSoundEmitter(ITr2ControllerAction.getOwner(controller), this.emitter);
    if (!ITr2ControllerAction.hasFunction(emitter, "SetPrefix"))
    {
      return;
    }
    emitter.SetPrefix(this.prefix);
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

// Native exposure ends at this concrete table (Tr2ActionSetAudioEmitterPrefix_Blue.cpp:14-15,23).
carbon.interfaceTable({
  interfaces: [Tr2ActionSetAudioEmitterPrefix, ITr2ControllerAction],
  chainTo: null
})(Tr2ActionSetAudioEmitterPrefix);
