import { exposure as be } from "#be";
// Source: trinity/trinity/Controllers/Actions/Tr2ActionSetAudioEmitterPrefix.h
// Source: trinity/trinity/Controllers/Actions/Tr2ActionSetAudioEmitterPrefix.cpp
// Source: trinity/trinity/Controllers/Actions/Tr2ActionSetAudioEmitterPrefix_Blue.cpp
import { CjsSchema, meta, type, blue } from "#schema";
import { ITr2ControllerAction } from "./ITr2ControllerAction.js";
import { ITr2SoundEmitterOwner } from "../../eve/ITr2SoundEmitterOwner.js";

/**
 * Controller action that sets the event-name prefix on a named audio emitter
 * when it starts, changing which bank events later sounds resolve to.
 */
@be.define("Tr2ActionSetAudioEmitterPrefix")
@be.mapInterface(ITr2ControllerAction)
export class Tr2ActionSetAudioEmitterPrefix extends ITr2ControllerAction
{
  /** m_emitterName: narrow emitter lookup name. */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  emitter = "";

  /** m_prefix: wide event prefix. */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.wstring
  prefix = "";

  /**
   * Sets the prefix when the controller owner exposes a named sound emitter.
   * @param {ITr2ActionController} controller The invoking controller.
   */

  @meta.implemented
  Start(controller)
  {
    const owner = CjsSchema.cast(controller.GetOwner(), ITr2SoundEmitterOwner);
    if (!owner) return;
    const emitter = owner.FindSoundEmitter(this.emitter);
    if (emitter) emitter.SetPrefix(this.prefix);
  }

  /**
   * Starts manually without changing state-machine state.
   * Adapted: JavaScript TypeError represents native PyErr_SetString for null.
   * @param {ITr2ActionController} controller The invoking controller.
   */
  @be.mapMethodAndWrap()
  @meta.adapted
  StartWithController(controller)
  {
    this.Start(ITr2ControllerAction.requireController(controller, "StartWithController"));
  }
}

// Native exposure ends here (Tr2ActionSetAudioEmitterPrefix_Blue.cpp:13-23).
