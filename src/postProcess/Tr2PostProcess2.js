// Source: E:\carbonengine\trinity\trinity\PostProcess\Tr2PostProcess2.h
// Source: E:\carbonengine\trinity\trinity\PostProcess\Tr2PostProcess2.cpp
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { Tr2PPDepthOfFieldEffect } from "./effect/Tr2PPDepthOfFieldEffect.js";


/**
 * The authored post-process chain as one slot per effect kind plus a LUT list,
 * with per-effect quality thresholds deciding which of them a frame is allowed
 * to use.
 */
@type.define({ className: "Tr2PostProcess2", family: "postProcess" })
export class Tr2PostProcess2 extends CjsModel
{

  // Carbon exposes this as a registered engine setting. Keeping it static makes
  // the graph deterministic while allowing a concrete backend to configure it.

  @io.persist
  @type.objectRef("Tr2PPSignalLossEffect")
  signalLoss = null;

  @io.persist
  @type.objectRef("Tr2PPGodRaysEffect")
  godRays = null;

  @io.persist
  @type.objectRef("Tr2PPBloomEffect")
  bloom = null;

  @io.persist
  @type.objectRef("Tr2PPDynamicExposureEffect")
  dynamicExposure = null;

  @io.persist
  @type.objectRef("Tr2PPFilmGrainEffect")
  filmGrain = null;

  @io.persist
  @type.objectRef("Tr2PPDesaturateEffect")
  desaturate = null;

  @io.persist
  @type.objectRef("Tr2PPFadeEffect")
  fade = null;

  @io.persist
  @type.list("Tr2PPLutEffect")
  luts = [];

  @io.persist
  @type.objectRef("Tr2PPLutEffect")
  lut = null;

  @io.persist
  @type.objectRef("Tr2PPVignetteEffect")
  vignette = null;

  @io.persist
  @type.objectRef("Tr2PPFogEffect")
  fog = null;

  @io.persist
  @type.objectRef("Tr2PPDepthOfFieldEffect")
  depthOfField = null;

  @io.readwrite
  @type.objectRef("Tr2PPTaaEffect")
  taa = null;

  @io.persist
  @type.objectRef("Tr2PPTonemappingEffect")
  tonemapping = null;

  @io.persist
  @type.objectRef("Tr2PPColorCorrectionEffect")
  colorCorrection = null;

  @io.persist
  @type.objectRef("Tr2PPGenericEffect")
  genericEffect = null;

  exposureAdjustment = 0;

  /**
   * Returns the -1 mip LOD bias temporal anti-aliasing requires when TAA is
   * active, and 0 otherwise.
   */
  @carbon.method
  @impl.implemented
  GetMipLodBias()
  {
    return Tr2PostProcess2.IsEffectActive(this.taa) ? -1 : 0;
  }

  /**
   * Collects the LUT effects with a positive influence - the single lut slot first, then the list - sorted by ascending influence. Carbon's misspelling of the name is preserved.
   * @param {Array} [container] caller-owned array, cleared and refilled in place
   * @returns {Array} the same container, left untouched when the quality setting is below LOW
   */
  @carbon.method
  @impl.implemented
  GetAvilableSortedLuts(container = [], qualitySetting = Tr2PostProcess2.HIGH)
  {
    if (qualitySetting < Tr2PostProcess2.LOW) return container;
    container.length = 0;
    if (Tr2PostProcess2.IsEffectActive(this.lut, effect => Number(effect.influence) > 0)) container.push(this.lut);
    for (const lut of this.luts)
    {
      if (Tr2PostProcess2.IsEffectActive(lut, effect => Number(effect.influence) > 0)) container.push(lut);
    }
    container.sort((a, b) => Number(a.influence) - Number(b.influence));
    return container;
  }

  /**
   * Appends a LUT effect to the list; a nullish argument is stored as an
   * explicit null entry.
   */
  @carbon.method
  @impl.implemented
  AddLut(effect)
  {
    this.luts.push(effect ?? null);
  }

  /** Empties the LUT list in place, leaving the single lut slot alone. */
  @carbon.method
  @impl.implemented
  ClearLuts()
  {
    this.luts.length = 0;
  }

  /**
   * Returns the signal-loss effect when it is active with a positive strength
   * and the quality setting is at least LOW, otherwise null.
   */
  GetSignalLossIfAvailable(quality = Tr2PostProcess2.HIGH)
  {
    return Tr2PostProcess2.GetIfAvailable(this.signalLoss, quality, Tr2PostProcess2.LOW, effect => Number(effect.strength) > 0);
  }

  /**
   * Returns the god-rays effect when it is active with a positive intensity and
   * the quality setting is HIGH, otherwise null.
   */
  GetGodRaysIfAvailable(quality = Tr2PostProcess2.HIGH)
  {
    return Tr2PostProcess2.GetIfAvailable(this.godRays, quality, Tr2PostProcess2.HIGH, effect => Number(effect.intensity) > 0);
  }

  /**
   * Returns the bloom effect when it is active and the quality setting is at
   * least MEDIUM, otherwise null.
   */
  GetBloomIfAvailable(quality = Tr2PostProcess2.HIGH)
  {
    return Tr2PostProcess2.GetIfAvailable(this.bloom, quality, Tr2PostProcess2.MEDIUM);
  }

  /**
   * Returns the dynamic-exposure effect when it is active and the quality
   * setting meets DynamicExposureQualityRequirement, otherwise null.
   */
  GetDynamicExposureIfAvailable(quality = Tr2PostProcess2.HIGH)
  {
    return Tr2PostProcess2.GetIfAvailable(this.dynamicExposure, quality, Tr2PostProcess2.DynamicExposureQualityRequirement);
  }

  /**
   * Returns the film-grain effect when it is active with a positive intensity
   * and the quality setting is HIGH, otherwise null.
   */
  GetFilmGrainIfAvailable(quality = Tr2PostProcess2.HIGH)
  {
    return Tr2PostProcess2.GetIfAvailable(this.filmGrain, quality, Tr2PostProcess2.HIGH, effect => Number(effect.intensity) > 0);
  }

  /**
   * Returns the desaturate effect when it is active and the quality setting is
   * at least MEDIUM, otherwise null.
   */
  GetDesaturateIfAvailable(quality = Tr2PostProcess2.HIGH)
  {
    return Tr2PostProcess2.GetIfAvailable(this.desaturate, quality, Tr2PostProcess2.MEDIUM);
  }

  /**
   * Returns the fade effect when it is active with a positive intensity and the
   * quality setting is at least LOW, otherwise null.
   */
  GetFadeIfAvailable(quality = Tr2PostProcess2.HIGH)
  {
    return Tr2PostProcess2.GetIfAvailable(this.fade, quality, Tr2PostProcess2.LOW, effect => Number(effect.intensity) > 0);
  }

  /**
   * Returns the vignette effect when it is active with both intensity and
   * opacity positive and the quality setting is at least MEDIUM, otherwise null.
   */
  GetVignetteIfAvailable(quality = Tr2PostProcess2.HIGH)
  {
    return Tr2PostProcess2.GetIfAvailable(this.vignette, quality, Tr2PostProcess2.MEDIUM, effect => Number(effect.intensity) > 0 && Number(effect.opacity) > 0);
  }

  /**
   * Returns the fog effect when it is active with a positive intensity and the
   * quality setting is HIGH, otherwise null.
   */
  GetFogIfAvailable(quality = Tr2PostProcess2.HIGH)
  {
    return Tr2PostProcess2.GetIfAvailable(this.fog, quality, Tr2PostProcess2.HIGH, effect => Number(effect.intensity) > 0);
  }

  /**
   * Returns the temporal anti-aliasing effect when it is active and the quality
   * setting is at least LOW, otherwise null.
   */
  GetTaaIfAvailable(quality = Tr2PostProcess2.HIGH)
  {
    return Tr2PostProcess2.GetIfAvailable(this.taa, quality, Tr2PostProcess2.LOW);
  }

  /**
   * Returns the depth-of-field effect when the process-wide depth-of-field
   * switch is on, its blur scale is positive and the quality setting is HIGH,
   * otherwise null.
   */
  GetDepthOfFieldIfAvailable(quality = Tr2PostProcess2.HIGH)
  {
    return Tr2PostProcess2.GetIfAvailable(this.depthOfField, quality, Tr2PostProcess2.HIGH, effect => Tr2PostProcess2.PostProcessDofEnabled && Number(effect.scale) > 0);
  }

  /**
   * Returns the tonemapping effect when it is active and the quality setting is
   * at least LOW, otherwise null.
   */
  GetTonemappingIfAvailable(quality = Tr2PostProcess2.HIGH)
  {
    return Tr2PostProcess2.GetIfAvailable(this.tonemapping, quality, Tr2PostProcess2.LOW);
  }

  /**
   * Returns the colour-correction effect when it is active and the quality
   * setting is at least LOW, otherwise null.
   */
  GetColorCorrectionIfAvailable(quality = Tr2PostProcess2.HIGH)
  {
    return Tr2PostProcess2.GetIfAvailable(this.colorCorrection, quality, Tr2PostProcess2.LOW);
  }

  /**
   * Returns the generic effect when it is active and the quality setting meets
   * the floor the effect itself declares, otherwise null.
   */
  GetGenericEffectIfAvailable(quality = Tr2PostProcess2.HIGH)
  {
    return Tr2PostProcess2.GetIfAvailable(this.genericEffect, quality, Number(this.genericEffect?.quality ?? Tr2PostProcess2.MEDIUM));
  }

  /** Installs the signal-loss effect; a nullish value clears the slot. */
  SetSignalLoss(effect)
  {
    this.signalLoss = effect ?? null;
  }

  /** Installs the god-rays effect; a nullish value clears the slot. */
  SetGodRays(effect)
  {
    this.godRays = effect ?? null;
  }

  /** Installs the bloom effect; a nullish value clears the slot. */
  SetBloom(effect)
  {
    this.bloom = effect ?? null;
  }

  /** Installs the dynamic-exposure effect; a nullish value clears the slot. */
  SetDynamicExposure(effect)
  {
    this.dynamicExposure = effect ?? null;
  }

  /** Installs the film-grain effect; a nullish value clears the slot. */
  SetFilmGrain(effect)
  {
    this.filmGrain = effect ?? null;
  }

  /** Installs the desaturate effect; a nullish value clears the slot. */
  SetDesaturate(effect)
  {
    this.desaturate = effect ?? null;
  }

  /** Installs the fade effect; a nullish value clears the slot. */
  SetFade(effect)
  {
    this.fade = effect ?? null;
  }

  /** Installs the vignette effect; a nullish value clears the slot. */
  SetVignette(effect)
  {
    this.vignette = effect ?? null;
  }

  /** Installs the fog effect; a nullish value clears the slot. */
  SetFog(effect)
  {
    this.fog = effect ?? null;
  }

  /**
   * Installs the temporal anti-aliasing effect; a nullish value clears the slot,
   * which also drops the mip LOD bias.
   */
  SetTaa(effect)
  {
    this.taa = effect ?? null;
  }

  /** Installs the depth-of-field effect; a nullish value clears the slot. */
  SetDepthOfField(effect)
  {
    this.depthOfField = effect ?? null;
  }

  /** Installs the tonemapping effect; a nullish value clears the slot. */
  SetTonemapping(effect)
  {
    this.tonemapping = effect ?? null;
  }

  /** Installs the colour-correction effect; a nullish value clears the slot. */
  SetColorCorrection(effect)
  {
    this.colorCorrection = effect ?? null;
  }

  /** Installs the generic effect; a nullish value clears the slot. */
  SetGenericEffect(effect)
  {
    this.genericEffect = effect ?? null;
  }

  static Quality = Object.freeze({
    LOW: 0,
    MEDIUM: 1,
    HIGH: 2,
    COUNT: 3
  });

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
   * Decides whether an effect contributes: its own IsActive() wins when it has
   * one, otherwise a false display flag disqualifies it and the optional
   * predicate has the final say.
   */
  static IsEffectActive(effect, predicate = null)
  {
    if (!effect) return false;
    if (typeof effect.IsActive === "function") return !!effect.IsActive();
    if (effect.display === false) return false;
    return predicate ? !!predicate(effect) : true;
  }

  /**
   * Returns the effect when it is active and the quality setting meets the
   * minimum the effect requires, otherwise null; the shared body behind every
   * Get*IfAvailable accessor.
   */
  static GetIfAvailable(effect, qualitySetting, minimumQuality, predicate = null)
  {
    return Tr2PostProcess2.IsEffectActive(effect, predicate) && qualitySetting >= minimumQuality ? effect : null;
  }
}
