import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveSmartLightBaseAttributeModifier as _EveSmartLightBaseAtt } from './EveSmartLightBaseAttributeModifier.js';
import { carbonPerlin1D } from '@carbonenginejs/runtime-utils/noise';

let _initProto, _initClass, _init_noiseAmplitude, _init_extra_noiseAmplitude, _init_noiseFrequency, _init_extra_noiseFrequency, _init_noiseOctaves, _init_extra_noiseOctaves;

/** EveSmartLightAttributeModifierNoise (eve/smartLights/attributeModifiers) - generated from schema shapeHash 60b52eeb.... */
let _EveSmartLightAttribu;
class EveSmartLightAttributeModifierNoise extends _EveSmartLightBaseAtt {
  static {
    ({
      e: [_init_noiseAmplitude, _init_extra_noiseAmplitude, _init_noiseFrequency, _init_extra_noiseFrequency, _init_noiseOctaves, _init_extra_noiseOctaves, _initProto],
      c: [_EveSmartLightAttribu, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSmartLightAttributeModifierNoise",
      family: "eve/smartLights/attributeModifiers"
    })], [[[io, io.persist, type, type.float32], 16, "noiseAmplitude"], [[io, io.persist, type, type.float32], 16, "noiseFrequency"], [[io, io.persist, type, type.uint32], 16, "noiseOctaves"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon samples BeOS->GetCurrentFrameTime() inside ProcessAttributeModifier; the frame time is captured from the update context here because ProcessAttributeModifier carries no context.")], 18, "UpdateSyncronous"], [[carbon, carbon.method, impl, impl.implemented], 18, "ProcessAttributeModifier"]], 0, void 0, _EveSmartLightBaseAtt));
  }
  /** m_noiseAmplitude (float) [READWRITE, PERSIST] */
  noiseAmplitude = (_initProto(this), _init_noiseAmplitude(this, 0));

  /** m_noiseFrequency (float) [READWRITE, PERSIST] */
  noiseFrequency = (_init_extra_noiseAmplitude(this), _init_noiseFrequency(this, 1));

  /** m_noiseOctaves (uint32_t) [READWRITE, PERSIST] */
  noiseOctaves = (_init_extra_noiseFrequency(this), _init_noiseOctaves(this, 1));

  /** Frame time captured per update; Carbon reads BeOS->GetCurrentFrameTime(). */
  #frameTime = (_init_extra_noiseOctaves(this), 0);

  /**
   * Advances the crossfade state machine and captures the frame time for the
   * per-placement noise sample
   * (EveSmartLightAttributeModifierNoise.cpp:14-17).
   */
  UpdateSyncronous(updateContext, _params, activationMultiplier) {
    this.#frameTime = Number(updateContext?.GetTime?.() ?? updateContext?.currentTime ?? 0);
    this.UpdateActivationStrength(activationMultiplier, updateContext?.GetDeltaT?.() ?? 0);
  }

  /**
   * Scales the attribute by a Perlin-noise brightness pulse
   * (EveSmartLightAttributeModifierNoise.cpp:19-30). PerlinNoise1D(x, 2, 2, n)
   * maps to the shared carbonPerlin1D port.
   */
  ProcessAttributeModifier(attribute, placement, _entityPosition, _entityDirection, modifierStrength) {
    const activationStrength = this.GetActivationStrength(placement) * modifierStrength;
    const activationAdjustedAmplitude = activationStrength * this.noiseAmplitude;
    if (activationAdjustedAmplitude > 0) {
      const noise = carbonPerlin1D(this.#frameTime * this.noiseFrequency, 2, 2, this.noiseOctaves);
      const noisifiedBrightness = (noise + 1) / 2 * activationAdjustedAmplitude;
      const scale = 1 + activationStrength * (noisifiedBrightness - 1);
      attribute[0] *= scale;
      attribute[1] *= scale;
      attribute[2] *= scale;
    }
  }
  static {
    _initClass();
  }
}

export { _EveSmartLightAttribu as EveSmartLightAttributeModifierNoise };
//# sourceMappingURL=EveSmartLightAttributeModifierNoise.js.map
