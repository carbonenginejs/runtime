import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';

let _initProto, _initClass, _init_position, _init_extra_position, _init_springConstant, _init_extra_springConstant;

/**
 * Linear spring pulling particles toward a fixed position with a force
 * proportional to displacement.
 */
let _Tr2ParticleSpring;
class Tr2ParticleSpring extends CjsModel {
  static {
    ({
      e: [_init_position, _init_extra_position, _init_springConstant, _init_extra_springConstant, _initProto],
      c: [_Tr2ParticleSpring, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2ParticleSpring",
      family: "particle"
    })], [[[io, io.persist, type, type.vec3], 16, "position"], [[io, io.persist, type, type.float32], 16, "springConstant"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetForce"], [[carbon, carbon.method, impl, impl.noop], 18, "Update"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_springConstant(this);
  }
  position = (_initProto(this), _init_position(this, vec3.create()));
  springConstant = (_init_extra_position(this), _init_springConstant(this, 0));

  /** Applies Carbon's linear spring force toward the configured origin. */
  GetForce(position, _velocity, _dt, _mass, out = vec3.create()) {
    vec3.subtract(out, position, this.position);
    return vec3.scale(out, out, -this.springConstant);
  }

  /**
   * Nothing to advance per frame: the spring force depends only on each
   * particle's current position.
   */
  Update(_dt) {}
  static {
    _initClass();
  }
}

export { _Tr2ParticleSpring as Tr2ParticleSpring };
//# sourceMappingURL=Tr2ParticleSpring.js.map
