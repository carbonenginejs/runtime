import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';

let _initProto, _initClass, _init_position, _init_extra_position, _init_magnitude, _init_extra_magnitude;

/**
 * Particle force of constant magnitude pointing at a fixed position, regardless
 * of distance.
 */
let _Tr2ParticleAttractor;
class Tr2ParticleAttractorForce extends CjsModel {
  static {
    ({
      e: [_init_position, _init_extra_position, _init_magnitude, _init_extra_magnitude, _initProto],
      c: [_Tr2ParticleAttractor, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2ParticleAttractorForce",
      family: "particle"
    })], [[[io, io.persist, type, type.vec3], 16, "position"], [[io, io.persist, type, type.float32], 16, "magnitude"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetForce"], [[carbon, carbon.method, impl, impl.noop], 18, "Update"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_magnitude(this);
  }
  position = (_initProto(this), _init_position(this, vec3.create()));
  magnitude = (_init_extra_position(this), _init_magnitude(this, 1));

  /** Applies a constant-magnitude force toward the configured origin. */
  GetForce(position, _velocity, _dt, _mass, out = vec3.create()) {
    vec3.subtract(out, this.position, position);
    const length = vec3.length(out);
    return length === 0 ? vec3.set(out, 0, 0, 0) : vec3.scale(out, out, this.magnitude / length);
  }

  /**
   * Nothing to advance per frame: the force depends only on the authored
   * position and magnitude.
   */
  Update(_dt) {}
  static {
    _initClass();
  }
}

export { _Tr2ParticleAttractor as Tr2ParticleAttractorForce };
//# sourceMappingURL=Tr2ParticleAttractorForce.js.map
