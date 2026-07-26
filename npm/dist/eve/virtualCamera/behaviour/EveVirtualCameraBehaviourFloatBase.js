import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';

let _initProto, _initClass, _init_active, _init_extra_active, _init_name, _init_extra_name;

/**
 * Base for the virtual camera behaviours that contribute a scalar delta to a
 * camera's field of view or roll each update.
 */
let _EveVirtualCameraBeha;
class EveVirtualCameraBehaviourFloatBase extends CjsModel {
  static {
    ({
      e: [_init_active, _init_extra_active, _init_name, _init_extra_name, _initProto],
      c: [_EveVirtualCameraBeha, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveVirtualCameraBehaviourFloatBase",
      family: "eve/virtualCamera/behaviour"
    })], [[[io, io.persist, type, type.boolean], 16, "active"], [[io, io.notify, io, io.persist, type, type.string], 16, "name"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetName"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetName"], [[carbon, carbon.method, impl, impl.adapted], 18, "OnModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsActive"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_name(this);
  }
  active = (_initProto(this), _init_active(this, true));
  name = (_init_extra_active(this), _init_name(this, ""));

  /** Returns the authored behaviour name shown in tooling. */
  GetName() {
    return this.name;
  }

  /**
   * Sets the behaviour name, coercing to a string; subclasses override this to
   * rename the curves they own alongside it.
   */
  SetName(name) {
    this.name = String(name);
  }

  /**
   * Re-applies the current name after a field change, which propagates it to any
   * owned curves through the subclass SetName override.
   */
  OnModified(_options = {}) {
    this.SetName(this.name);
    return true;
  }

  /** Reports whether the camera should evaluate this behaviour this update. */
  IsActive() {
    return this.active;
  }
  static {
    _initClass();
  }
}

export { _EveVirtualCameraBeha as EveVirtualCameraBehaviourFloatBase };
//# sourceMappingURL=EveVirtualCameraBehaviourFloatBase.js.map
