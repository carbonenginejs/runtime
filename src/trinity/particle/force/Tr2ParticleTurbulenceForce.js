// Source: trinity/trinity/Particle/Tr2ParticleTurbulenceForce.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { impl, io, type } from "#schema";
import { CjsModel } from "#model";
import { noise } from "#math/noise";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";

/** A time-evolving four-dimensional Perlin turbulence force applied to particle motion. */
@type.define({ className: "Tr2ParticleTurbulenceForce", family: "particle" })
export class Tr2ParticleTurbulenceForce extends CjsModel
{

  #time = 0;

  /** m_amplitude (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  amplitude = vec3.fromValues(1, 1, 1);

  /** m_frequency (Vector4) [READWRITE, PERSIST] */
  @io.persist
  @type.vec4
  frequency = vec4.fromValues(1, 1, 1, 1);

  /** m_noiseLevel (uint32_t) [READWRITE, PERSIST] */
  @io.persist
  @type.uint32
  noiseLevel = 3;

  /** m_noiseRatio (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  noiseRatio = 0.5;

  /**
   * Samples the four-dimensional turbulence field at a particle's position and time, scaled by the configured amplitude.
   */
  @impl.adapted
  @impl.reason("Uses core-math's browser port of Carbon's four-dimensional turbulence lookup.")
  GetForce(position, _velocity, _dt, _mass, out = vec3.create())
  {
    vec3.set(out, 0, 0, 0);
    const levels = Math.max(0, Math.trunc(Number(this.noiseLevel) || 0));
    if (levels === 0)
    {
      return out;
    }
    const ratio = Number(this.noiseRatio);
    if (!Number.isFinite(ratio) || ratio === 0)
    {
      return out;
    }
    let x = (position?.[0] ?? 0) * this.frequency[0];
    let y = (position?.[1] ?? 0) * this.frequency[1];
    let z = (position?.[2] ?? 0) * this.frequency[2];
    let w = this.#time * this.frequency[3];
    let sum = 0;
    let power = 0.5;
    const frequency = 1 / ratio;
    for (let level = 0; level < levels; level++)
    {
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
  @impl.implemented
  Update(dt)
  {
    this.#time += Math.max(0, Number(dt) || 0);
  }

}
