// Source: trinity/trinity/Controllers/Actions/Tr2ActionSetAttenuationScaling.h
// Source: trinity/trinity/Controllers/Actions/Tr2ActionSetAttenuationScaling.cpp
import { CjsModel } from "#model";
import { carbon, impl, io, type } from "#schema";
import { ITr2ControllerAction } from "./ITr2ControllerAction.js";


/**
 * Controller action that sets an audio emitter's distance-attenuation scaling
 * factor on start, optionally multiplied by a named controller variable.
 */
@type.define({
  className: "Tr2ActionSetAttenuationScaling",
  family: "controllers"
})
export class Tr2ActionSetAttenuationScaling extends CjsModel
{
  @io.persist
  @type.string
  emitter = "";

  @io.persist
  @type.string
  controllerVariable = "";

  @io.persist
  @type.float32
  scalingFactor = 1;

  /**
   * Links this action to a controller for scaling-factor lookup.
   */
  @carbon.method
  @impl.adapted
  Link(controller)
  {
    this.#controller = controller;
  }

  /**
   * Clears the linked controller.
   */
  @carbon.method
  @impl.implemented
  Unlink()
  {
    this.#controller = null;
  }
  #controller = null;

  /**
   * Applies attenuation scaling to a named emitter.
   */
  @carbon.method
  @impl.adapted
  Start(controller = this.#controller)
  {
    const emitter = ITr2ControllerAction.findSoundEmitter(ITr2ControllerAction.getOwner(controller), this.emitter);
    const value = this.GetScalingFactor(controller);
    if (ITr2ControllerAction.hasFunction(emitter, "SetAttenuationScalingFactor"))
    {
      emitter.SetAttenuationScalingFactor(value);
    }
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
   * Gets final scaling factor, including controller variable multiplier.
   */
  @carbon.method
  @impl.adapted
  GetScalingFactor(controller = this.#controller)
  {
    if (!this.controllerVariable)
    {
      return this.scalingFactor;
    }
    const controllerVariableValue = ITr2ControllerAction.toNumber(controller?.GetFloatVariableByName?.(this.controllerVariable), 0);
    return controllerVariableValue !== 0 ? this.scalingFactor * controllerVariableValue : this.scalingFactor;
  }
}
