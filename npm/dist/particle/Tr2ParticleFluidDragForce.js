import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';

let _initProto, _initClass, _init_drag, _init_extra_drag;

/**
 * Quadratic fluid drag on particles, clamped so a single integration step can
 * never push a particle's velocity past zero into a reversal.
 */
let _Tr2ParticleFluidDrag;
class Tr2ParticleFluidDragForce extends CjsModel {
  static {
    ({
      e: [_init_drag, _init_extra_drag, _initProto],
      c: [_Tr2ParticleFluidDrag, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2ParticleFluidDragForce",
      family: "particle"
    })], [[[io, io.persist, type, type.float32], 16, "drag"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetForce"], [[carbon, carbon.method, impl, impl.noop], 18, "Update"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_drag(this);
  }
  drag = (_initProto(this), _init_drag(this, 1));

  /** Applies quadratic drag and Carbon's one-frame velocity reversal clamp. */
  GetForce(_position, velocity, dt, mass, out = vec3.create()) {
    const speed = vec3.length(velocity);
    const forceScale = -speed * this.drag;
    const step = dt * mass;
    const predictedDot = speed * speed * (1 + forceScale * step);
    return vec3.scale(out, velocity, predictedDot < 0 ? -1 / step : forceScale);
  }

  /**
   * Nothing to advance per frame: the drag term is derived from the particle's
   * current velocity and the step it is being integrated over.
   */
  Update(_dt) {}
  static {
    _initClass();
  }
}

export { _Tr2ParticleFluidDrag as Tr2ParticleFluidDragForce };
//# sourceMappingURL=Tr2ParticleFluidDragForce.js.map
