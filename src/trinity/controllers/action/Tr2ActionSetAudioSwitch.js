// Source: trinity/trinity/Controllers/Actions/Tr2ActionSetAudioSwitch.h
// Source: trinity/trinity/Controllers/Actions/Tr2ActionSetAudioSwitch.cpp
// Source: trinity/trinity/Controllers/Actions/Tr2ActionSetAudioSwitch_Blue.cpp
import { CjsSchema, meta, types } from "#schema";
import { ITr2ControllerAction } from "./ITr2ControllerAction.js";
import { ITr2SoundEmitterOwner } from "../../eve/ITr2SoundEmitterOwner.js";


/**
 * Controller action that sets a Wwise switch group to a given state on a named
 * audio emitter when it starts.
 */
@meta.define({
  className: "Tr2ActionSetAudioSwitch",
  family: "controllers"
})
export class Tr2ActionSetAudioSwitch extends ITr2ControllerAction
{
  @meta.edit.readwrite
  @meta.edit.persist
  @types.string
  emitter = "";

  @meta.edit.readwrite
  @meta.edit.persist
  @types.wstring
  switchGroup = "";

  @meta.edit.readwrite
  @meta.edit.persist
  @types.wstring
  switchState = "";

  /**
   * Sets a Wwise-style switch on a named emitter.
   */
  @meta.carbon.method
  @meta.impl.implemented
  Start(controller)
  {
    const owner = CjsSchema.cast(controller.GetOwner(), ITr2SoundEmitterOwner);
    if (!owner) return;
    const emitter = owner.FindSoundEmitter(this.emitter);
    if (emitter) emitter.SetSwitch(this.switchGroup, this.switchState);
  }

  /**
   * Starts manually with an explicit controller.
   * Adapted: TypeError represents the native null-controller Python error.
   */
  @meta.carbon.method
  @meta.impl.adapted
  StartWithController(controller)
  {
    this.Start(ITr2ControllerAction.requireController(controller, "StartWithController"));
  }
}

// Native exposure ends at this concrete table (Tr2ActionSetAudioSwitch_Blue.cpp:14-15,25).
meta.carbon.interfaceTable({
  interfaces: [Tr2ActionSetAudioSwitch, ITr2ControllerAction],
  chainTo: null
})(Tr2ActionSetAudioSwitch);
