// Source: trinity/trinity/Controllers/Actions/Tr2ActionSetAudioSwitch.h
// Source: trinity/trinity/Controllers/Actions/Tr2ActionSetAudioSwitch.cpp
// Source: trinity/trinity/Controllers/Actions/Tr2ActionSetAudioSwitch_Blue.cpp
import { CjsSchema, meta } from "#schema";
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
  /**
   * Name of the sound emitter resolved on the controller owner.
   * @type {string}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  emitter = "";

  /**
   * Wwise switch group receiving the selected state; native std::wstring.
   * @type {string}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.wstring
  switchGroup = "";

  /**
   * Wwise state applied to switchGroup on the emitter; native std::wstring.
   * @type {string}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.wstring
  switchState = "";

  /**
   * Sets a Wwise-style switch on a named emitter.
   */
  @meta.blue.method
  @meta.implemented
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
  @meta.blue.method
  @meta.adapted
  StartWithController(controller)
  {
    this.Start(ITr2ControllerAction.requireController(controller, "StartWithController"));
  }
}

// Native exposure ends at this concrete table (Tr2ActionSetAudioSwitch_Blue.cpp:14-15,25).
meta.blue.interfaceTable({
  interfaces: [Tr2ActionSetAudioSwitch, ITr2ControllerAction],
  chainTo: null
})(Tr2ActionSetAudioSwitch);
