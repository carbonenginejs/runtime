// Source: trinity/trinity/Eve/SpaceObject/Children/SmartLightSets/attributeModifiers/EveSmartLightAttributeModifierNoise.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta, type, blue } from "#schema";
import { EveSmartLightBaseAttributeModifier } from "./EveSmartLightBaseAttributeModifier.js";
import { IEveSmartLightGroupAttributeModifier } from "./IEveSmartLightGroupAttributeModifier.js";
import { carbonPerlin1D } from "#math/noise";

/** EveSmartLightAttributeModifierNoise (eve/smartLights/attributeModifiers) - generated from schema shapeHash 60b52eeb.... */
@blue.define("EveSmartLightAttributeModifierNoise")
@blue.interface(IEveSmartLightGroupAttributeModifier)
@blue.chainTo(EveSmartLightBaseAttributeModifier)
export class EveSmartLightAttributeModifierNoise extends IEveSmartLightGroupAttributeModifier
{

  /** m_noiseAmplitude (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  noiseAmplitude = 0;

  /** m_noiseFrequency (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  noiseFrequency = 1;

  /** m_noiseOctaves (uint32_t) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.uint32
  noiseOctaves = 1;

  /** Frame time captured per update; Carbon reads BeOS->GetCurrentFrameTime(). */
  _frameTime = 0;

  /**
   * Advances the crossfade state machine and captures the frame time for the
   * per-placement noise sample
   * (EveSmartLightAttributeModifierNoise.cpp:14-17).
   *
   * Adapted: Carbon samples BeOS->GetCurrentFrameTime() inside ProcessAttributeModifier; the
   * frame time is captured from the update context here because ProcessAttributeModifier
   * carries no context.
   */
  @blue.method
  @meta.adapted
  UpdateSyncronous(updateContext, _params, activationMultiplier)
  {
    this._frameTime = Number(updateContext.GetTime());
    this.UpdateActivationStrength(activationMultiplier, updateContext.GetDeltaT());
  }

  /**
   * Scales the attribute by a Perlin-noise brightness pulse
   * (EveSmartLightAttributeModifierNoise.cpp:19-30). PerlinNoise1D(x, 2, 2, n)
   * maps to the shared carbonPerlin1D port.
   */
  @blue.method
  @meta.implemented
  ProcessAttributeModifier(attribute, placement, _entityPosition, _entityDirection, modifierStrength)
  {
    const activationStrength = this.GetActivationStrength(placement) * modifierStrength;
    const activationAdjustedAmplitude = activationStrength * this.noiseAmplitude;

    if (activationAdjustedAmplitude > 0)
    {
      const noise = carbonPerlin1D(this._frameTime * this.noiseFrequency, 2, 2, this.noiseOctaves);
      const noisifiedBrightness = ((noise + 1) / 2) * activationAdjustedAmplitude;
      const scale = 1 + activationStrength * (noisifiedBrightness - 1);
      attribute[0] *= scale;
      attribute[1] *= scale;
      attribute[2] *= scale;
    }
  }

}
