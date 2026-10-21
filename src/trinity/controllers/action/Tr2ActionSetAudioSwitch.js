import { exposure as be } from "#be";
// Source: trinity/trinity/Controllers/Actions/Tr2ActionSetAudioSwitch.h
// Source: trinity/trinity/Controllers/Actions/Tr2ActionSetAudioSwitch.cpp
// Source: trinity/trinity/Controllers/Actions/Tr2ActionSetAudioSwitch_Blue.cpp
import { CjsSchema, meta, type, blue } from "#schema";
import { ITr2ControllerAction } from "./ITr2ControllerAction.js";
import { ITr2SoundEmitterOwner } from "../../eve/ITr2SoundEmitterOwner.js";


/**
 * Controller action that sets a Wwise switch group to a given state on a named
 * audio emitter when it starts.
 */
@be.define("Tr2ActionSetAudioSwitch")
export class Tr2ActionSetAudioSwitch extends ITr2ControllerAction
{
  /**
   * Name of the sound emitter resolved on the controller owner.
   * @type {string}
   */
  @blue.readwrite
  @blue.persist
  @type.string
  emitter = "";

  /**
   * Wwise switch group receiving the selected state; native std::wstring.
   * @type {string}
   */
  @blue.readwrite
  @blue.persist
  @type.wstring
  switchGroup = "";

  /**
   * Wwise state applied to switchGroup on the emitter; native std::wstring.
   * @type {string}
   */
  @blue.readwrite
  @blue.persist
  @type.wstring
  switchState = "";

  /**
   * Sets a Wwise-style switch on a named emitter.
   */
  @blue.method
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
  @blue.method
  @meta.adapted
  StartWithController(controller)
  {
    this.Start(ITr2ControllerAction.requireController(controller, "StartWithController"));
  }
}

// Native exposure ends at this concrete table (Tr2ActionSetAudioSwitch_Blue.cpp:14-15,25).
CjsSchema.exposure.mapInterface(ITr2ControllerAction)(Tr2ActionSetAudioSwitch);
