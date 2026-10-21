import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/SpaceObject/Children/SmartLightSets/attributeModifiers/EveSmartLightAttributeModifierNoise.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta, type } from "#schema";
import { blue, CcpTime } from "#blue";
import { EveSmartLightBaseAttributeModifier } from "./EveSmartLightBaseAttributeModifier.js";
import { IEveSmartLightGroupAttributeModifier } from "./IEveSmartLightGroupAttributeModifier.js";
import { carbonPerlin1D } from "#math/noise";

/** EveSmartLightAttributeModifierNoise (eve/smartLights/attributeModifiers) - generated from schema shapeHash 60b52eeb.... */
@be.define("EveSmartLightAttributeModifierNoise")
@be.mapInterface(IEveSmartLightGroupAttributeModifier)
@be.exposureChainTo(EveSmartLightBaseAttributeModifier)
export class EveSmartLightAttributeModifierNoise extends IEveSmartLightGroupAttributeModifier
{

  /** m_noiseAmplitude (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  noiseAmplitude = 0;

  /** m_noiseFrequency (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  noiseFrequency = 1;

  /** m_noiseOctaves (uint32_t) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.uint32
  noiseOctaves = 1;

  /**
   * Advances the crossfade state machine by the frame delta
   * (EveSmartLightAttributeModifierNoise.cpp:14-17).
   */

  @meta.implemented
  UpdateSyncronous(updateContext, _params, activationMultiplier)
  {
    this.UpdateActivationStrength(activationMultiplier, updateContext.GetDeltaT());
  }

  /**
   * Scales the attribute by a Perlin-noise brightness pulse
   * (EveSmartLightAttributeModifierNoise.cpp:19-30), sampled at Blue's frame time
   * in seconds, read here as Carbon reads TimeAsDouble( BeOS->GetCurrentFrameTime() ).
   * PerlinNoise1D(x, 2, 2, n) maps to the shared carbonPerlin1D port.
   */

  @meta.implemented
  ProcessAttributeModifier(attribute, placement, _entityPosition, _entityDirection, modifierStrength)
  {
    const activationStrength = this.GetActivationStrength(placement) * modifierStrength;
    const activationAdjustedAmplitude = activationStrength * this.noiseAmplitude;

    if (activationAdjustedAmplitude > 0)
    {
      const noise = carbonPerlin1D(CcpTime.timeAsDouble(blue.os.GetCurrentFrameTime()) * this.noiseFrequency, 2, 2, this.noiseOctaves);
      const noisifiedBrightness = ((noise + 1) / 2) * activationAdjustedAmplitude;
      const scale = 1 + activationStrength * (noisifiedBrightness - 1);
      attribute[0] *= scale;
      attribute[1] *= scale;
      attribute[2] *= scale;
    }
  }

}
