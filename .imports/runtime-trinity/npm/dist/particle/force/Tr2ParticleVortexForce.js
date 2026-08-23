import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';

let _initProto, _initClass, _init_magnitude, _init_extra_magnitude, _init_axis, _init_extra_axis, _init_position, _init_extra_position;

/**
 * Particle force of constant magnitude directed tangentially around an axis
 * through a fixed position, swirling particles about it.
 */
let _Tr2ParticleVortexFor;
class Tr2ParticleVortexForce extends CjsModel {
  static {
    ({
      e: [_init_magnitude, _init_extra_magnitude, _init_axis, _init_extra_axis, _init_position, _init_extra_position, _initProto],
      c: [_Tr2ParticleVortexFor, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2ParticleVortexForce",
      family: "particle"
    })], [[[io, io.persist, type, type.float32], 16, "magnitude"], [[io, io.persist, type, type.vec3], 16, "axis"], [[io, io.persist, type, type.vec3], 16, "position"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetForce"], [[carbon, carbon.method, impl, impl.noop], 18, "Update"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_position(this);
  }
  magnitude = (_initProto(this), _init_magnitude(this, 1));
  axis = (_init_extra_magnitude(this), _init_axis(this, vec3.fromValues(0, 1, 0)));
  position = (_init_extra_axis(this), _init_position(this, vec3.create()));

  /** Applies Carbon's normalized tangential vortex force. */
  GetForce(position, _velocity, _dt, _mass, out = vec3.create()) {
    vec3.subtract(out, this.position, position);
    vec3.cross(out, out, this.axis);
    const length = vec3.length(out);
    return length === 0 ? vec3.set(out, 0, 0, 0) : vec3.scale(out, out, this.magnitude / length);
  }

  /**
   * Nothing to advance per frame: the vortex is fully described by its axis,
   * position and magnitude.
   */
  Update(_dt) {}
  static {
    _initClass();
  }
}

export { _Tr2ParticleVortexFor as Tr2ParticleVortexForce };
//# sourceMappingURL=Tr2ParticleVortexForce.js.map
