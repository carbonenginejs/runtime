import { exposure as be } from "#be";
// Source: trinity/trinity/Controllers/Actions/Tr2ActionSetAttenuationScaling.h
// Source: trinity/trinity/Controllers/Actions/Tr2ActionSetAttenuationScaling.cpp
// Source: trinity/trinity/Controllers/Actions/Tr2ActionSetAttenuationScaling_Blue.cpp
import { CjsSchema, type, blue } from "#schema";
import { ITr2ControllerAction } from "./ITr2ControllerAction.js";
import { ITr2SoundEmitterOwner } from "../../eve/ITr2SoundEmitterOwner.js";

/**
 * Controller action that sets an audio emitter's distance-attenuation scaling
 * factor on start, optionally multiplied by a named controller variable.
 */
@be.define("Tr2ActionSetAttenuationScaling")
@be.mapInterface(ITr2ControllerAction)
export class Tr2ActionSetAttenuationScaling extends ITr2ControllerAction
{
  /** m_emitterName: narrow emitter lookup name. */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  emitter = "";

  /** m_controllerVariableName: optional variable sampled from the linked controller. */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  controllerVariable = "";

  /** m_scalingFactor: authored attenuation multiplier. */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  scalingFactor = 1;

  /**
   * Live native READ property; samples the currently linked controller.
   *
   * @implemented
   */
  @be.mapPropertyReadOnly()
  @type.float32
  get finalScalingFactor()
  {
    return this.GetScalingFactor();
  }

  /** m_controller: non-owning controller pointer established by Link. */
  _controller = null;

  /**
   * @implemented
   * @param {ITr2ActionController} controller Controller supplying the multiplier.
   */

  Link(controller)
  {
    this._controller = controller;
  }

  /**
   * Releases the linked controller pointer.
   *
   * @implemented
   */

  Unlink()
  {
    this._controller = null;
  }

  /**
   * Finds an emitter on the invoking controller owner, then applies linked scaling.
   * The invocation controller chooses the target; Link chooses the variable source
   * (Tr2ActionSetAttenuationScaling.cpp:28-37,53-77).
   *
   * @implemented
   * @param {ITr2ActionController} controller The invoking controller.
   */

  Start(controller)
  {
    const owner = CjsSchema.cast(controller.GetOwner(), ITr2SoundEmitterOwner);
    if (!owner) return;
    const emitter = owner.FindSoundEmitter(this.emitter);
    if (emitter) emitter.SetAttenuationScalingFactor(this.GetScalingFactor());
  }

  /**
   * Starts manually without changing state-machine state.
   *
   * @adapted JavaScript TypeError represents native PyErr_SetString for null.
   * @param {ITr2ActionController} controller The invoking controller.
   */
  @be.mapMethodAndWrap()
  StartWithController(controller)
  {
    this.Start(ITr2ControllerAction.requireController(controller, "StartWithController"));
  }

  /**
   * Returns the authored factor times a nonzero linked controller variable.
   *
   * @adapted the controller's undefined value represents native optional absence.
   *   Native zero means no multiplier; negative and nonfinite values are not clamped.
   * @returns {number} The attenuation scaling factor.
   */

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
