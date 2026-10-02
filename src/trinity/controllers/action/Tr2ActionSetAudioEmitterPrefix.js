// Source: trinity/trinity/Controllers/Actions/Tr2ActionSetAudioEmitterPrefix.h
// Source: trinity/trinity/Controllers/Actions/Tr2ActionSetAudioEmitterPrefix.cpp
// Source: trinity/trinity/Controllers/Actions/Tr2ActionSetAudioEmitterPrefix_Blue.cpp
import { CjsSchema, meta } from "#schema";
import { ITr2ControllerAction } from "./ITr2ControllerAction.js";
import { ITr2SoundEmitterOwner } from "../../eve/ITr2SoundEmitterOwner.js";

/**
 * Controller action that sets the event-name prefix on a named audio emitter
 * when it starts, changing which bank events later sounds resolve to.
 */
@meta.define({ className: "Tr2ActionSetAudioEmitterPrefix", family: "controllers" })
export class Tr2ActionSetAudioEmitterPrefix extends ITr2ControllerAction
{
  /** m_emitterName: narrow emitter lookup name. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  emitter = "";

  /** m_prefix: wide event prefix. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.wstring
  prefix = "";

  /**
   * Sets the prefix when the controller owner exposes a named sound emitter.
   * @param {ITr2ActionController} controller The invoking controller.
   */
  @meta.blue.method
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
  @meta.blue.method
  @meta.adapted
  StartWithController(controller)
  {
    this.Start(ITr2ControllerAction.requireController(controller, "StartWithController"));
  }
}

// Native exposure ends here (Tr2ActionSetAudioEmitterPrefix_Blue.cpp:13-23).
meta.blue.interfaceTable({
  interfaces: [Tr2ActionSetAudioEmitterPrefix, ITr2ControllerAction],
  chainTo: null
})(Tr2ActionSetAudioEmitterPrefix);
