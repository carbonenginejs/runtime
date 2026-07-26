import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';

let _initProto, _initClass, _init_force, _init_extra_force;

/** Constant particle force vector, applied identically to every particle. */
let _Tr2ParticleDirectFor;
class Tr2ParticleDirectForce extends CjsModel {
  static {
    ({
      e: [_init_force, _init_extra_force, _initProto],
      c: [_Tr2ParticleDirectFor, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2ParticleDirectForce",
      family: "particle"
    })], [[[io, io.persist, type, type.vec3], 16, "force"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetForce"], [[carbon, carbon.method, impl, impl.noop], 18, "Update"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_force(this);
  }
  force = (_initProto(this), _init_force(this, vec3.fromValues(1, 1, 1)));

  /** Copies the authored constant force into caller-owned output. */
  GetForce(_position, _velocity, _dt, _mass, out = vec3.create()) {
    return vec3.copy(out, this.force);
  }

  /**
   * Nothing to advance per frame: the force vector is authored and never
   * changes.
   */
  Update(_dt) {}
  static {
    _initClass();
  }
}

export { _Tr2ParticleDirectFor as Tr2ParticleDirectForce };
//# sourceMappingURL=Tr2ParticleDirectForce.js.map
