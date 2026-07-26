import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';

let _initProto, _initClass, _init_drag, _init_extra_drag;

/** Linear particle drag: a force proportional to velocity and opposing it. */
let _Tr2ParticleDragForce;
class Tr2ParticleDragForce extends CjsModel {
  static {
    ({
      e: [_init_drag, _init_extra_drag, _initProto],
      c: [_Tr2ParticleDragForce, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2ParticleDragForce",
      family: "particle"
    })], [[[io, io.persist, type, type.float32], 16, "drag"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetForce"], [[carbon, carbon.method, impl, impl.noop], 18, "Update"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_drag(this);
  }
  drag = (_initProto(this), _init_drag(this, 0.1));

  /** Carbon's drag force is proportional and opposite to velocity. */
  GetForce(_position, velocity, _dt, _mass, out = vec3.create()) {
    return vec3.scale(out, velocity, -this.drag);
  }

  /**
   * Nothing to advance per frame: drag is computed from each particle's current
   * velocity.
   */
  Update(_dt) {}
  static {
    _initClass();
  }
}

export { _Tr2ParticleDragForce as Tr2ParticleDragForce };
//# sourceMappingURL=Tr2ParticleDragForce.js.map
