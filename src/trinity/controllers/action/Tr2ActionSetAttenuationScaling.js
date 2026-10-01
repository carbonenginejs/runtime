// Source: trinity/trinity/Controllers/Actions/Tr2ActionSetAttenuationScaling.h
// Source: trinity/trinity/Controllers/Actions/Tr2ActionSetAttenuationScaling.cpp
// Source: trinity/trinity/Controllers/Actions/Tr2ActionSetAttenuationScaling_Blue.cpp
import { CjsSchema, meta, types } from "#schema";
import { ITr2ControllerAction } from "./ITr2ControllerAction.js";
import { ITr2SoundEmitterOwner } from "../../eve/ITr2SoundEmitterOwner.js";

/**
 * Controller action that sets an audio emitter's distance-attenuation scaling
 * factor on start, optionally multiplied by a named controller variable.
 */
@meta.define({ className: "Tr2ActionSetAttenuationScaling", family: "controllers" })
export class Tr2ActionSetAttenuationScaling extends ITr2ControllerAction
{
  /** m_emitterName: narrow emitter lookup name. */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.string
  emitter = "";

  /** m_controllerVariableName: optional variable sampled from the linked controller. */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.string
  controllerVariable = "";

  /** m_scalingFactor: authored attenuation multiplier. */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  scalingFactor = 1;

  /** Live native READ property; samples the currently linked controller. */
  @meta.property()
  @meta.edit.read
  @types.float32
  @meta.impl.implemented
  get finalScalingFactor()
  {
    return this.GetScalingFactor();
  }

  /** m_controller: non-owning controller pointer established by Link. */
  _controller = null;

  /** @param {ITr2ActionController} controller Controller supplying the multiplier. */
  @meta.carbon.method
  @meta.impl.implemented
  Link(controller)
  {
    this._controller = controller;
  }

  /** Releases the linked controller pointer. */
  @meta.carbon.method
  @meta.impl.implemented
  Unlink()
  {
    this._controller = null;
  }

  /**
   * Finds an emitter on the invoking controller owner, then applies linked scaling.
   * The invocation controller chooses the target; Link chooses the variable source
   * (Tr2ActionSetAttenuationScaling.cpp:28-37,53-77).
   * @param {ITr2ActionController} controller The invoking controller.
   */
  @meta.carbon.method
  @meta.impl.implemented
  Start(controller)
  {
    const owner = CjsSchema.cast(controller.GetOwner(), ITr2SoundEmitterOwner);
    if (!owner) return;
    const emitter = owner.FindSoundEmitter(this.emitter);
    if (emitter) emitter.SetAttenuationScalingFactor(this.GetScalingFactor());
  }

  /**
   * Starts manually without changing state-machine state.
   * Adapted: JavaScript TypeError represents native PyErr_SetString for null.
   * @param {ITr2ActionController} controller The invoking controller.
   */
  @meta.carbon.method
  @meta.impl.adapted
  StartWithController(controller)
  {
    this.Start(ITr2ControllerAction.requireController(controller, "StartWithController"));
  }

  /**
   * Returns the authored factor times a nonzero linked controller variable.
   * Adapted: the controller's undefined value represents native optional absence.
   * Native zero means no multiplier; negative and nonfinite values are not clamped.
   * @returns {number} The attenuation scaling factor.
   */
  @meta.carbon.method
  @meta.impl.adapted
  GetScalingFactor()
  {
    let value = 0;
    if (this.controllerVariable && this._controller !== null)
    {
      value = this._controller.GetFloatVariableByName(this.controllerVariable) ?? 0;
    }
    return value !== 0 ? this.scalingFactor * value : this.scalingFactor;
  }
}

// Native exposure ends here (Tr2ActionSetAttenuationScaling_Blue.cpp:12-45).
meta.carbon.interfaceTable({
  interfaces: [Tr2ActionSetAttenuationScaling, ITr2ControllerAction],
  chainTo: null
})(Tr2ActionSetAttenuationScaling);
