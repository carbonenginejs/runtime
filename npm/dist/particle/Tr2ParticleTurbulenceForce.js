import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { noise } from '@carbonenginejs/runtime-utils/noise';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initProto, _initClass, _init_amplitude, _init_extra_amplitude, _init_frequency, _init_extra_frequency, _init_noiseLevel, _init_extra_noiseLevel, _init_noiseRatio, _init_extra_noiseRatio;

/** A time-evolving four-dimensional Perlin turbulence force applied to particle motion. */
let _Tr2ParticleTurbulenc;
class Tr2ParticleTurbulenceForce extends CjsModel {
  static {
    ({
      e: [_init_amplitude, _init_extra_amplitude, _init_frequency, _init_extra_frequency, _init_noiseLevel, _init_extra_noiseLevel, _init_noiseRatio, _init_extra_noiseRatio, _initProto],
      c: [_Tr2ParticleTurbulenc, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2ParticleTurbulenceForce",
      family: "particle"
    })], [[[io, io.persist, type, type.vec3], 16, "amplitude"], [[io, io.persist, type, type.vec4], 16, "frequency"], [[io, io.persist, type, type.uint32], 16, "noiseLevel"], [[io, io.persist, type, type.float32], 16, "noiseRatio"], [[impl, impl.adapted, void 0, impl.reason("Uses core-math's browser port of Carbon's four-dimensional turbulence lookup.")], 18, "GetForce"], [[impl, impl.implemented], 18, "Update"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_noiseRatio(this);
  }
  #time = (_initProto(this), 0);

  /** m_amplitude (Vector3) [READWRITE, PERSIST] */
  amplitude = _init_amplitude(this, vec3.fromValues(1, 1, 1));

  /** m_frequency (Vector4) [READWRITE, PERSIST] */
  frequency = (_init_extra_amplitude(this), _init_frequency(this, vec4.fromValues(1, 1, 1, 1)));

  /** m_noiseLevel (uint32_t) [READWRITE, PERSIST] */
  noiseLevel = (_init_extra_frequency(this), _init_noiseLevel(this, 3));

  /** m_noiseRatio (float) [READWRITE, PERSIST] */
  noiseRatio = (_init_extra_noiseLevel(this), _init_noiseRatio(this, 0.5));

  /**
   * Samples the four-dimensional turbulence field at a particle's position and time, scaled by the configured amplitude.
   */
  GetForce(position, _velocity, _dt, _mass, out = vec3.create()) {
    vec3.set(out, 0, 0, 0);
    const levels = Math.max(0, Math.trunc(Number(this.noiseLevel) || 0));
    if (levels === 0) {
      return out;
    }
    const ratio = Number(this.noiseRatio);
    if (!Number.isFinite(ratio) || ratio === 0) {
      return out;
    }
    let x = (position?.[0] ?? 0) * this.frequency[0];
    let y = (position?.[1] ?? 0) * this.frequency[1];
    let z = (position?.[2] ?? 0) * this.frequency[2];
    let w = this.#time * this.frequency[3];
    let sum = 0;
    let power = 0.5;
    const frequency = 1 / ratio;
    for (let level = 0; level < levels; level++) {
      noise.turbulence(out, x, y, z, w, power);
      sum += power;
      x *= frequency;
      y *= frequency;
      z *= frequency;
      w *= frequency;
      power *= ratio;
    }
    out[0] *= this.amplitude[0] * sum;
    out[1] *= this.amplitude[1] * sum;
    out[2] *= this.amplitude[2] * sum;
    return out;
  }

  /**
   * Advances the time accumulator that animates the turbulence field.
   */
  Update(dt) {
    this.#time += Math.max(0, Number(dt) || 0);
  }
  static {
    _initClass();
  }
}

export { _Tr2ParticleTurbulenc as Tr2ParticleTurbulenceForce };
//# sourceMappingURL=Tr2ParticleTurbulenceForce.js.map
