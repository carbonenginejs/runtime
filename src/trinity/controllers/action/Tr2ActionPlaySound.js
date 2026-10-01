// Source: trinity/trinity/Controllers/Actions/Tr2ActionPlaySound.h
// Source: trinity/trinity/Controllers/Actions/Tr2ActionPlaySound.cpp
// Source: trinity/trinity/Controllers/Actions/Tr2ActionPlaySound_Blue.cpp
import { meta, types } from "#schema";
import { ITr2ControllerAction } from "./ITr2ControllerAction.js";


/**
 * Controller action that fires a one-shot audio event on a named emitter when
 * the action starts; it has no stop behaviour.
 */
@meta.define({
  className: "Tr2ActionPlaySound",
  family: "controllers"
})
export class Tr2ActionPlaySound extends ITr2ControllerAction
{
  /** m_emitterName: narrow BlueSharedString emitter lookup name. */
  @meta.member("emitter")
  @meta.edit.readwrite
  @meta.edit.persist
  @types.string
  emitter = "";

  /** m_soundEvent: narrow BlueSharedString, converted to wide text by native SendEvent. */
  @meta.member("event")
  @meta.edit.readwrite
  @meta.edit.persist
  @types.string
  event = "";

  /** m_target: optional parameter or effect-child name. */
  @meta.member("target")
  @meta.edit.readwrite
  @meta.edit.persist
  @types.string
  target = "";

  /** m_bypassPrefix: whether SendEvent bypasses the emitter prefix. */
  @meta.member("bypassPrefix")
  @meta.edit.readwrite
  @meta.edit.persist
  @types.boolean
  bypassPrefix = false;

  /**
   * Plays a sound event on the resolved audio emitter.
   * Adapted: retains the existing structural owner/target lookup instead of
   * native EveMultiEffect, IEveEffectChildrenOwner and ITr2SoundEmitterOwner
   * casts. IEveEffectChildrenOwner has no shared JS contract yet; this batch
   * does not invent one. A returned emitter must implement SendEvent. JavaScript
   * strings replace the native narrow-to-wide conversion, and absent owners
   * remain silent rather than emitting the native diagnostic.
   */
  @meta.carbon.method
  @meta.impl.adapted
  Start(controller)
  {
    const owner = Tr2ActionPlaySound._resolveOwner(ITr2ControllerAction.getOwner(controller), this.target);
    const emitter = ITr2ControllerAction.findSoundEmitter(owner, this.emitter);
    if (!emitter)
    {
      return;
    }
    emitter.SendEvent(this.event, this.bypassPrefix);
  }

  /**
   * Starts manually with an explicit controller.
   * Adapted: preserves the existing non-null action-controller adapter, including
   * timeline controllers. Native BluePythonCast accepts Tr2Controller specifically
   * (Tr2ActionPlaySound.cpp:52-61); narrowing this entry point is deferred.
   */
  @meta.carbon.method
  @meta.impl.adapted
  StartWithController(controller)
  {
    this.Start(ITr2ControllerAction.requireController(controller, "StartWithController"));
  }

  /**
   * Redirects to the object named by `target`, preferring a named parameter
   * owner and otherwise a named effect child; an empty target keeps the
   * controller owner.
   * Custom: extracted structural target adapter. Unlike native Start, a missing
   * multi-effect parameter returns null rather than retaining the initial sound
   * owner. Parameter object/property alternatives remain supported, and a method
   * lookup takes precedence over effect-child lookup. Native cast/target parity
   * requires the separate owner-contract migration.
   */
  @meta.impl.custom
  static _resolveOwner(owner, target)
  {
    if (!owner || !target)
    {
      return owner;
    }
    if (ITr2ControllerAction.hasFunction(owner, "GetParameterByName"))
    {
      return ITr2ControllerAction.getParameterOwner(owner, target);
    }
    if (ITr2ControllerAction.hasFunction(owner, "GetEffectChildByName"))
    {
      return ITr2ControllerAction.asObject(owner.GetEffectChildByName(target));
    }
    return owner;
  }
}

// Native exposure ends at this concrete table (Tr2ActionPlaySound_Blue.cpp:13-14,25).
meta.carbon.interfaceTable({
  interfaces: [Tr2ActionPlaySound, ITr2ControllerAction],
  chainTo: null
})(Tr2ActionPlaySound);
