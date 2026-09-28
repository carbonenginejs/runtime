// Source: trinity/trinity/Particle/Tr2GpuParticleSystem.h (EmitterParamsGpu, :179-201)
// Source: trinity/trinity/Particle/Tr2GpuParticleSystem.cpp (its constructor, :59-77)
// Hand-maintained: Carbon's nested struct, in its own file so it is findable by
// name; Tr2GpuParticleSystem.EmitterParamsGpu is this type.

/** Carbon MAX_TURBULENCE_LENGTH (Tr2GpuParticleSystem.cpp:22), shared with the system's turbulence offset. */
export const MAX_TURBULENCE_LENGTH = 4096;

/**
 * Carbon's Tr2GpuParticleSystem::EmitterParamsGpu (Tr2GpuParticleSystem.h:179-201).
 *
 * The struct is its byte layout here: the emit requests and the CPU mirror
 * hold it as 32 floats, and `write` is its constructor from EmitterParams
 * (cpp:59-77). Adapted: Carbon constructs a struct value; JavaScript writes
 * into storage the request record already owns.
 */
export class Tr2GpuParticleSystemEmitterParamsGpu
{
  /** sizeof(EmitterParamsGpu). */
  static SIZE = 128;

  /**
   * Carbon's EmitterParamsGpu( const EmitterParams& ) (cpp:59-77): the
   * texture index carries the colour midpoint in its fraction, and the
   * turbulence frequency is scaled into turbulence space.
   *
   * @param {Float32Array} out 32 floats.
   * @param {object} params A Tr2GpuSharedEmitter params record.
   * @returns {Float32Array} `out`.
   */
  static write(out, params)
  {
    const midpoint = params.colorMidpoint;
    out[0] = params.minLifeTime;
    out[1] = params.maxLifeTime;
    out[2] = (params.textureIndex >>> 0) + Math.max(0.001, Math.min(0.99, 1 - midpoint - Math.floor(midpoint)));
    for (let c = 0; c < 4; c++)
    {
      for (let k = 0; k < 4; k++) out[3 + c * 4 + k] = params.colors[c][k];
    }
    out[19] = params.sizes[0];
    out[20] = params.sizes[1];
    out[21] = params.sizes[2];
    out[22] = params.sizeVariance;
    out[23] = params.drag;
    out[24] = params.turbulenceAmplitude;
    out[25] = (params.turbulenceFrequency >>> 0) / MAX_TURBULENCE_LENGTH;
    out[26] = params.gravity;
    out[27] = params.attractorPosition[0];
    out[28] = params.attractorPosition[1];
    out[29] = params.attractorPosition[2];
    out[30] = params.attractorStrength;
    out[31] = params.velocityStretchRotation;
    return out;
  }
}
