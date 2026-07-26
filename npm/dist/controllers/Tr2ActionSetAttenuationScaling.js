import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { ITr2ControllerAction } from './ITr2ControllerAction.js';

let _initProto, _initClass, _init_emitter, _init_extra_emitter, _init_controllerVariable, _init_extra_controllerVariable, _init_scalingFactor, _init_extra_scalingFactor;

/**
 * Controller action that sets an audio emitter's distance-attenuation scaling
 * factor on start, optionally multiplied by a named controller variable.
 */
let _Tr2ActionSetAttenuat;
class Tr2ActionSetAttenuationScaling extends CjsModel {
  static {
    ({
      e: [_init_emitter, _init_extra_emitter, _init_controllerVariable, _init_extra_controllerVariable, _init_scalingFactor, _init_extra_scalingFactor, _initProto],
      c: [_Tr2ActionSetAttenuat, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2ActionSetAttenuationScaling",
      family: "controllers"
    })], [[[io, io.persist, type, type.string], 16, "emitter"], [[io, io.persist, type, type.string], 16, "controllerVariable"], [[io, io.persist, type, type.float32], 16, "scalingFactor"], [[carbon, carbon.method, impl, impl.adapted], 18, "Link"], [[carbon, carbon.method, impl, impl.implemented], 18, "Unlink"], [[carbon, carbon.method, impl, impl.adapted], 18, "Start"], [[carbon, carbon.method, impl, impl.implemented], 18, "StartWithController"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetScalingFactor"]], 0, void 0, CjsModel));
  }
  emitter = (_initProto(this), _init_emitter(this, ""));
  controllerVariable = (_init_extra_emitter(this), _init_controllerVariable(this, ""));
  scalingFactor = (_init_extra_controllerVariable(this), _init_scalingFactor(this, 1));

  /**
   * Links this action to a controller for scaling-factor lookup.
   */
  Link(controller) {
    this.#controller = controller;
  }

  /**
   * Clears the linked controller.
   */
  Unlink() {
    this.#controller = null;
  }
  #controller = (_init_extra_scalingFactor(this), null);

  /**
   * Applies attenuation scaling to a named emitter.
   */
  Start(controller = this.#controller) {
    const emitter = ITr2ControllerAction.findSoundEmitter(ITr2ControllerAction.getOwner(controller), this.emitter);
    const value = this.GetScalingFactor(controller);
    if (ITr2ControllerAction.hasFunction(emitter, "SetAttenuationScalingFactor")) {
      emitter.SetAttenuationScalingFactor(value);
    }
  }

  /**
   * Starts manually with an explicit controller.
   */
  StartWithController(controller) {
    this.Start(ITr2ControllerAction.requireController(controller, "StartWithController"));
  }

  /**
   * Gets final scaling factor, including controller variable multiplier.
   */
  GetScalingFactor(controller = this.#controller) {
    if (!this.controllerVariable) {
      return this.scalingFactor;
    }
    const controllerVariableValue = ITr2ControllerAction.toNumber(controller?.GetFloatVariableByName?.(this.controllerVariable), 0);
    return controllerVariableValue !== 0 ? this.scalingFactor * controllerVariableValue : this.scalingFactor;
  }
  static {
    _initClass();
  }
}

export { _Tr2ActionSetAttenuat as Tr2ActionSetAttenuationScaling };
//# sourceMappingURL=Tr2ActionSetAttenuationScaling.js.map
