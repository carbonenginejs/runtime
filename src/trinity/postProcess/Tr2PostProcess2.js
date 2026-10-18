import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/PostProcess/Tr2PostProcess2.h
// Source: trinity/trinity/PostProcess/Tr2PostProcess2.cpp
import { meta, type, blue } from "#schema";
import { Tr2PPDepthOfFieldEffect } from "./effect/Tr2PPDepthOfFieldEffect.js";
import { Quality } from "../generated/postProcess/enums.js";


/**
 * The authored post-process chain as one slot per effect kind plus a LUT list,
 * with per-effect quality thresholds deciding which of them a frame is allowed
 * to use.
 */
@blue.define("Tr2PostProcess2")
@blue.inherit(IRoot)
export class Tr2PostProcess2
{

  // Carbon exposes this as a registered engine setting. Keeping it static makes
  // the graph deterministic while allowing a concrete backend to configure it.

  @blue.readwrite
  @blue.persist
  @type.rootRef("Tr2PPSignalLossEffect")
  signalLoss = null;

  @blue.readwrite
  @blue.persist
  @type.rootRef("Tr2PPGodRaysEffect")
  godRays = null;

  @blue.readwrite
  @blue.persist
  @type.rootRef("Tr2PPBloomEffect")
  bloom = null;

  @blue.readwrite
  @blue.persist
  @type.rootRef("Tr2PPDynamicExposureEffect")
  dynamicExposure = null;

  @blue.readwrite
  @blue.persist
  @type.rootRef("Tr2PPFilmGrainEffect")
  filmGrain = null;

  @blue.readwrite
  @blue.persist
  @type.rootRef("Tr2PPDesaturateEffect")
  desaturate = null;

  @blue.readwrite
  @blue.persist
  @type.rootRef("Tr2PPFadeEffect")
  fade = null;

  @blue.read
  @blue.persist
  @type.list("Tr2PPLutEffect")
  luts = [];

  @blue.readwrite
  @blue.persist
  @type.rootRef("Tr2PPLutEffect")
  lut = null;

  @blue.readwrite
  @blue.persist
  @type.rootRef("Tr2PPVignetteEffect")
  vignette = null;

  @blue.readwrite
  @blue.persist
  @type.rootRef("Tr2PPFogEffect")
  fog = null;

  @blue.readwrite
  @blue.persist
  @type.rootRef("Tr2PPDepthOfFieldEffect")
  depthOfField = null;

  @blue.readwrite
  @type.rootRef("Tr2PPTaaEffect")
  taa = null;

  @blue.readwrite
  @blue.persist
  @type.rootRef("Tr2PPTonemappingEffect")
  tonemapping = null;

  @blue.readwrite
  @blue.persist
  @type.rootRef("Tr2PPColorCorrectionEffect")
  colorCorrection = null;

  @blue.readwrite
  @blue.persist
  @type.rootRef("Tr2PPGenericEffect")
  genericEffect = null;

  exposureAdjustment = 0;

  /**
   * Returns the -1 mip LOD bias temporal anti-aliasing requires when TAA is
   * active, and 0 otherwise.
   */
  @blue.method
  @meta.implemented
  GetMipLodBias()
  {
    return Tr2PostProcess2.IsEffectActive(this.taa) ? -1 : 0;
  }

  /**
   * Collects the LUT effects with a positive influence - the single lut slot first, then the list - sorted by ascending influence. Carbon's misspelling of the name is preserved.
   * @param {Array} [container] caller-owned array, cleared and refilled in place
   * @returns {Array} the same container, left untouched when the quality setting is below LOW
   */
  @blue.method
  @meta.implemented
  GetAvilableSortedLuts(container = [], qualitySetting = Tr2PostProcess2.HIGH)
  {
    if (qualitySetting < Tr2PostProcess2.LOW) return container;
    container.length = 0;
    if (Tr2PostProcess2.IsEffectActive(this.lut)) container.push(this.lut);
    for (const lut of this.luts)
    {
      if (Tr2PostProcess2.IsEffectActive(lut)) container.push(lut);
    }
    container.sort((a, b) => Number(a.influence) - Number(b.influence));
    return container;
  }

  /**
   * Appends a LUT effect to the list; a nullish argument is stored as an
   * explicit null entry.
   */
  @blue.method
  @meta.implemented
  AddLut(effect)
  {
    this.luts.push(effect ?? null);
  }

  /** Empties the LUT list in place, leaving the single lut slot alone. */
  @blue.method
  @meta.implemented
  ClearLuts()
  {
    this.luts.length = 0;
  }

  /**
   * Returns the signal-loss effect when it is active with a positive strength
   * and the quality setting is at least LOW, otherwise null.
   */
  @blue.method
  GetSignalLossIfAvailable(quality = Tr2PostProcess2.HIGH)
  {
    return Tr2PostProcess2.GetIfAvailable(this.signalLoss, quality, Tr2PostProcess2.LOW);
  }

  /**
   * Returns the god-rays effect when it is active with a positive intensity and
   * the quality setting is HIGH, otherwise null.
   */
  @blue.method
  GetGodRaysIfAvailable(quality = Tr2PostProcess2.HIGH)
  {
    return Tr2PostProcess2.GetIfAvailable(this.godRays, quality, Tr2PostProcess2.HIGH);
  }

  /**
   * Returns the bloom effect when it is active and the quality setting is at
   * least MEDIUM, otherwise null.
   */
  @blue.method
  GetBloomIfAvailable(quality = Tr2PostProcess2.HIGH)
  {
    return Tr2PostProcess2.GetIfAvailable(this.bloom, quality, Tr2PostProcess2.MEDIUM);
  }

  /**
   * Returns the dynamic-exposure effect when it is active and the quality
   * setting meets DynamicExposureQualityRequirement, otherwise null.
   */
  @blue.method
  GetDynamicExposureIfAvailable(quality = Tr2PostProcess2.HIGH)
  {
    return Tr2PostProcess2.GetIfAvailable(this.dynamicExposure, quality, Tr2PostProcess2.DynamicExposureQualityRequirement);
  }

  /**
   * Returns the film-grain effect when it is active with a positive intensity
   * and the quality setting is HIGH, otherwise null.
   */
  @blue.method
  GetFilmGrainIfAvailable(quality = Tr2PostProcess2.HIGH)
  {
    return Tr2PostProcess2.GetIfAvailable(this.filmGrain, quality, Tr2PostProcess2.HIGH);
  }

  /**
   * Returns the desaturate effect when it is active and the quality setting is
   * at least MEDIUM, otherwise null.
   */
  @blue.method
  GetDesaturateIfAvailable(quality = Tr2PostProcess2.HIGH)
  {
    return Tr2PostProcess2.GetIfAvailable(this.desaturate, quality, Tr2PostProcess2.MEDIUM);
  }

  /**
   * Returns the fade effect when it is active with a positive intensity and the
   * quality setting is at least LOW, otherwise null.
   */
  @blue.method
  GetFadeIfAvailable(quality = Tr2PostProcess2.HIGH)
  {
    return Tr2PostProcess2.GetIfAvailable(this.fade, quality, Tr2PostProcess2.LOW);
  }

  /**
   * Returns the vignette effect when it is active with both intensity and
   * opacity positive and the quality setting is at least MEDIUM, otherwise null.
   */
  @blue.method
  GetVignetteIfAvailable(quality = Tr2PostProcess2.HIGH)
  {
    return Tr2PostProcess2.GetIfAvailable(this.vignette, quality, Tr2PostProcess2.MEDIUM, effect => Number(effect.intensity) > 0 && Number(effect.opacity) > 0);
  }

  /**
   * Returns the fog effect when it is active with a positive intensity and the
   * quality setting is HIGH, otherwise null.
   */
  @blue.method
  GetFogIfAvailable(quality = Tr2PostProcess2.HIGH)
  {
    return Tr2PostProcess2.GetIfAvailable(this.fog, quality, Tr2PostProcess2.HIGH);
  }

  /**
   * Returns the temporal anti-aliasing effect when it is active and the quality
   * setting is at least LOW, otherwise null.
   */
  @blue.method
  GetTaaIfAvailable(quality = Tr2PostProcess2.HIGH)
  {
    return Tr2PostProcess2.GetIfAvailable(this.taa, quality, Tr2PostProcess2.LOW);
  }

  /**
   * Returns the depth-of-field effect when the process-wide depth-of-field
   * switch is on, its blur scale is positive and the quality setting is HIGH,
   * otherwise null.
   */
  @blue.method
  GetDepthOfFieldIfAvailable(quality = Tr2PostProcess2.HIGH)
  {
    return Tr2PostProcess2.GetIfAvailable(this.depthOfField, quality, Tr2PostProcess2.HIGH, effect => Tr2PostProcess2.PostProcessDofEnabled && Number(effect.scale) > 0);
  }

  /**
   * Returns the tonemapping effect when it is active and the quality setting is
   * at least LOW, otherwise null.
   */
  @blue.method
  GetTonemappingIfAvailable(quality = Tr2PostProcess2.HIGH)
  {
    return Tr2PostProcess2.GetIfAvailable(this.tonemapping, quality, Tr2PostProcess2.LOW);
  }

  /**
   * Returns the colour-correction effect when it is active and the quality
   * setting is at least LOW, otherwise null.
   */
  @blue.method
  GetColorCorrectionIfAvailable(quality = Tr2PostProcess2.HIGH)
  {
    return Tr2PostProcess2.GetIfAvailable(this.colorCorrection, quality, Tr2PostProcess2.LOW);
  }

  /**
   * Returns the generic effect when it is active and the quality setting meets
   * the floor the effect itself declares, otherwise null.
   */
  @blue.method
  GetGenericEffectIfAvailable(quality = Tr2PostProcess2.HIGH)
  {
    return Tr2PostProcess2.GetIfAvailable(this.genericEffect, quality, Number(this.genericEffect?.quality ?? Tr2PostProcess2.MEDIUM));
  }

  /** Installs the signal-loss effect; a nullish value clears the slot. */
  @blue.method
  SetSignalLoss(effect)
  {
    this.signalLoss = effect ?? null;
  }

  /** Installs the god-rays effect; a nullish value clears the slot. */
  @blue.method
  SetGodRays(effect)
  {
    this.godRays = effect ?? null;
  }

  /** Installs the bloom effect; a nullish value clears the slot. */
  @blue.method
  SetBloom(effect)
  {
    this.bloom = effect ?? null;
  }

  /** Installs the dynamic-exposure effect; a nullish value clears the slot. */
  @blue.method
  SetDynamicExposure(effect)
  {
    this.dynamicExposure = effect ?? null;
  }

  /** Installs the film-grain effect; a nullish value clears the slot. */
  @blue.method
  SetFilmGrain(effect)
  {
    this.filmGrain = effect ?? null;
  }

  /** Installs the desaturate effect; a nullish value clears the slot. */
  @blue.method
  SetDesaturate(effect)
  {
    this.desaturate = effect ?? null;
  }

  /** Installs the fade effect; a nullish value clears the slot. */
  @blue.method
  SetFade(effect)
  {
    this.fade = effect ?? null;
  }

  /** Installs the vignette effect; a nullish value clears the slot. */
  @blue.method
  SetVignette(effect)
  {
    this.vignette = effect ?? null;
  }

  /** Installs the fog effect; a nullish value clears the slot. */
  @blue.method
  SetFog(effect)
  {
    this.fog = effect ?? null;
  }

  /**
   * Installs the temporal anti-aliasing effect; a nullish value clears the slot,
   * which also drops the mip LOD bias.
   */
  @blue.method
  SetTaa(effect)
  {
    this.taa = effect ?? null;
  }

  /** Installs the depth-of-field effect; a nullish value clears the slot. */
  @blue.method
  SetDepthOfField(effect)
  {
    this.depthOfField = effect ?? null;
  }

  /** Installs the tonemapping effect; a nullish value clears the slot. */
  @blue.method
  SetTonemapping(effect)
  {
    this.tonemapping = effect ?? null;
  }

  /** Installs the colour-correction effect; a nullish value clears the slot. */
  @blue.method
  SetColorCorrection(effect)
  {
    this.colorCorrection = effect ?? null;
  }

  /** Installs the generic effect; a nullish value clears the slot. */
  @blue.method
  SetGenericEffect(effect)
  {
    this.genericEffect = effect ?? null;
  }

  static Quality = Quality;

  static LOW = 0;

  static MEDIUM = 1;

  static HIGH = 2;

  static COUNT = 3;

  static DynamicExposureQualityRequirement = Tr2PostProcess2.MEDIUM;

  /**
   * Reads the process-wide depth-of-field switch, which is stored on
   * Tr2PPDepthOfFieldEffect and gates every graph at once.
   */
  static get PostProcessDofEnabled()
  {
    return Tr2PPDepthOfFieldEffect.PostProcessDofEnabled;
  }

  /**
   * Sets the process-wide depth-of-field switch on Tr2PPDepthOfFieldEffect,
   * coerced to a boolean; in Carbon this is a registered engine setting.
   */
  static set PostProcessDofEnabled(value)
  {
    Tr2PPDepthOfFieldEffect.PostProcessDofEnabled = !!value;
  }

  /**
   * Whether an effect contributes: Carbon's `effect && effect->IsActive()`
   * (Tr2PostProcess2.cpp:10). Every effect is a Tr2PPEffect, whose IsActive
   * each subclass refines.
   */
  static IsEffectActive(effect)
  {
    return !!effect && effect.IsActive();
  }

  /**
   * Returns the effect when it is active and the quality setting meets the
   * minimum the effect requires, otherwise null; the shared body behind every
   * Get*IfAvailable accessor.
   */
  static GetIfAvailable(effect, qualitySetting, minimumQuality)
  {
    return Tr2PostProcess2.IsEffectActive(effect) && qualitySetting >= minimumQuality ? effect : null;
  }
}
