// Source: trinity/trinity/Controllers/Actions/Tr2ActionPlaySound.h
// Source: trinity/trinity/Controllers/Actions/Tr2ActionPlaySound.cpp
import { CjsModel } from "#model";
import { carbon, impl, io, type } from "#schema";
import { ITr2ControllerAction } from "./ITr2ControllerAction.js";


/**
 * Controller action that fires a one-shot audio event on a named emitter when
 * the action starts; it has no stop behaviour.
 */
@type.define({
  className: "Tr2ActionPlaySound",
  family: "controllers"
})
export class Tr2ActionPlaySound extends CjsModel
{
  @io.persist
  @type.string
  emitter = "";

  @io.persist
  @type.string
  event = "";

  @io.persist
  @type.string
  target = "";

  @io.persist
  @type.boolean
  bypassPrefix = false;

  /**
   * Plays a sound event on the resolved audio emitter.
   */
  @carbon.method
  @impl.adapted
  Start(controller)
  {
    const owner = Tr2ActionPlaySound.#resolveOwner(ITr2ControllerAction.getOwner(controller), this.target);
    const emitter = ITr2ControllerAction.findSoundEmitter(owner, this.emitter);
    if (!ITr2ControllerAction.hasFunction(emitter, "SendEvent"))
    {
      return;
    }
    emitter.SendEvent(this.event, this.bypassPrefix);
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

  /**
   * Redirects to the object named by `target`, preferring a named parameter
   * owner and otherwise a named effect child; an empty target keeps the
   * controller owner.
   */
  static #resolveOwner(owner, target)
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
