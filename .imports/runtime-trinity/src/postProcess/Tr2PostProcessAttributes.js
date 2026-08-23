// Source: E:\carbonengine\trinity\trinity\PostProcess\Tr2PostProcessAttributes.h
// Source: E:\carbonengine\trinity\trinity\PostProcess\Tr2PostProcessAttributes.cpp
// Source: E:\carbonengine\trinity\trinity\PostProcess\Tr2PostProcessAttributes_Blue.cpp
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { vec2 } from "@carbonenginejs/runtime-utils/vec2";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { Tr2PPBloomEffect } from "./effect/Tr2PPBloomEffect.js";
import { Tr2PPColorCorrectionEffect } from "./effect/Tr2PPColorCorrectionEffect.js";
import { Tr2PPDepthOfFieldEffect } from "./effect/Tr2PPDepthOfFieldEffect.js";
import { Tr2PPDesaturateEffect } from "./effect/Tr2PPDesaturateEffect.js";
import { Tr2PPFadeEffect } from "./effect/Tr2PPFadeEffect.js";
import { Tr2PPFilmGrainEffect } from "./effect/Tr2PPFilmGrainEffect.js";
import { Tr2PPLutEffect } from "./effect/Tr2PPLutEffect.js";
import { Tr2PPSignalLossEffect } from "./effect/Tr2PPSignalLossEffect.js";
import { Tr2PPVignetteEffect } from "./effect/Tr2PPVignetteEffect.js";
import { AttributeType, Priority } from "../generated/postProcess/enums.js";


/**
 * One post-process volume's contribution: a value and an enable flag per
 * attribute, plus the priority band and intensity that weight it when several
 * volumes are blended together.
 */
@type.define({ className: "Tr2PostProcessAttributes", family: "postProcess" })
export class Tr2PostProcessAttributes extends CjsModel
{

  @io.persist
  @type.int32
  @type.enum("Priority")
  priority = Tr2PostProcessAttributes.MEDIUM_PRIORITY;

  @io.read
  @type.float32
  intensity = 0;

  @io.persist
  @type.boolean
  signalLossIntensityEnabled = false;

  @io.persist
  @type.float32
  signalLossIntensity = 0;

  @io.persist
  @type.boolean
  bloomBrightnessEnabled = false;

  @io.persist
  @type.float32
  bloomBrightness = 0;

  @io.persist
  @type.boolean
  bloomLuminanceThresholdEnabled = false;

  @io.persist
  @type.float32
  bloomLuminanceThreshold = 0;

  @io.persist
  @type.boolean
  bloomLuminanceScaleEnabled = false;

  @io.persist
  @type.float32
  bloomLuminanceScale = 0;

  @io.persist
  @type.boolean
  bloomSizeScaleEnabled = false;

  @io.persist
  @type.float32
  bloomSizeScale = 4;

  @io.persist
  @type.boolean
  bloomDirectionalWeightEnabled = false;

  @io.persist
  @type.float32
  bloomDirectionalWeight = 0;

  @io.persist
  @type.boolean
  bloomStepSize1Enabled = false;

  @io.persist
  @type.float32
  bloomStepSize1 = 0.3;

  @io.persist
  @type.boolean
  bloomStepSize2Enabled = false;

  @io.persist
  @type.float32
  bloomStepSize2 = 1;

  @io.persist
  @type.boolean
  bloomStepSize3Enabled = false;

  @io.persist
  @type.float32
  bloomStepSize3 = 2;

  @io.persist
  @type.boolean
  bloomStepSize4Enabled = false;

  @io.persist
  @type.float32
  bloomStepSize4 = 10;

  @io.persist
  @type.boolean
  bloomStepSize5Enabled = false;

  @io.persist
  @type.float32
  bloomStepSize5 = 30;

  @io.persist
  @type.boolean
  bloomStepSize6Enabled = false;

  @io.persist
  @type.float32
  bloomStepSize6 = 64;

  @io.persist
  @type.boolean
  bloomStepTint1Enabled = false;

  @io.persist
  @type.color
  bloomStepTint1 = vec4.fromValues(0.3465, 0.3465, 0.3465, 0.3465);

  @io.persist
  @type.boolean
  bloomStepTint2Enabled = false;

  @io.persist
  @type.color
  bloomStepTint2 = vec4.fromValues(0.138, 0.138, 0.138, 0.138);

  @io.persist
  @type.boolean
  bloomStepTint3Enabled = false;

  @io.persist
  @type.color
  bloomStepTint3 = vec4.fromValues(0.1176, 0.1176, 0.1176, 0.1176);

  @io.persist
  @type.boolean
  bloomStepTint4Enabled = false;

  @io.persist
  @type.color
  bloomStepTint4 = vec4.fromValues(0.066, 0.066, 0.066, 0.066);

  @io.persist
  @type.boolean
  bloomStepTint5Enabled = false;

  @io.persist
  @type.color
  bloomStepTint5 = vec4.fromValues(0.066, 0.066, 0.066, 0.066);

  @io.persist
  @type.boolean
  bloomStepTint6Enabled = false;

  @io.persist
  @type.color
  bloomStepTint6 = vec4.fromValues(0.061, 0.061, 0.061, 0.061);

  @io.persist
  @type.boolean
  grimeIntensityEnabled = false;

  @io.persist
  @type.float32
  grimeIntensity = 0;

  @io.persist
  @type.boolean
  grimePathEnabled = false;

  @io.persist
  @type.string
  grimePath = "";

  @io.persist
  @type.boolean
  exposureAdjustmentEnabled = false;

  @io.persist
  @type.float32
  exposureAdjustment = 0;

  @io.persist
  @type.boolean
  filmGrainIntensityEnabled = false;

  @io.persist
  @type.float32
  filmGrainIntensity = 0;

  @io.persist
  @type.boolean
  filmGrainSizeEnabled = false;

  @io.persist
  @type.float32
  filmGrainSize = 0;

  @io.persist
  @type.boolean
  filmGrainDensityEnabled = false;

  @io.persist
  @type.float32
  filmGrainDensity = 0;

  @io.persist
  @type.boolean
  filmGrainContrastEnabled = false;

  @io.persist
  @type.float32
  filmGrainContrast = 0;

  @io.persist
  @type.boolean
  filmGrainBrightnessModifierEnabled = false;

  @io.persist
  @type.float32
  filmGrainBrightnessModifier = 0;

  @io.persist
  @type.boolean
  filmGrainColoredEnabled = false;

  @io.persist
  @type.boolean
  filmGrainColored = false;

  @io.persist
  @type.boolean
  filmGrainColorAmountEnabled = false;

  @io.persist
  @type.float32
  filmGrainColorAmount = 0;

  @io.persist
  @type.boolean
  saturationEnabled = false;

  @io.persist
  @type.float32
  saturation = 0;

  @io.persist
  @type.boolean
  fadeIntensityEnabled = false;

  @io.persist
  @type.float32
  fadeIntensity = 0;

  @io.persist
  @type.boolean
  fadeColorEnabled = false;

  @io.persist
  @type.color
  fadeColor = vec4.fromValues(0, 0, 0, 1);

  @io.persist
  @type.boolean
  lutIntensityEnabled = false;

  @io.persist
  @type.float32
  lutIntensity = 0;

  @io.persist
  @type.boolean
  lutPathEnabled = false;

  @io.persist
  @type.string
  lutPath = "";

  @io.persist
  @type.boolean
  vignetteIntensityEnabled = false;

  @io.persist
  @type.float32
  vignetteIntensity = 0;

  @io.persist
  @type.boolean
  vignetteOpacityEnabled = false;

  @io.persist
  @type.float32
  vignetteOpacity = 0;

  @io.persist
  @type.boolean
  vignetteColorEnabled = false;

  @io.persist
  @type.color
  vignetteColor = vec4.fromValues(1, 1, 1, 1);

  @io.persist
  @type.boolean
  vignetteDetail1SizeEnabled = false;

  @io.persist
  @type.vec2
  vignetteDetail1Size = vec2.fromValues(16, 16);

  @io.persist
  @type.boolean
  vignetteDetail1ScrollEnabled = false;

  @io.persist
  @type.vec2
  vignetteDetail1Scroll = vec2.create();

  @io.persist
  @type.boolean
  vignetteDetail2SizeEnabled = false;

  @io.persist
  @type.vec2
  vignetteDetail2Size = vec2.fromValues(16, 16);

  @io.persist
  @type.boolean
  vignetteDetail2ScrollEnabled = false;

  @io.persist
  @type.vec2
  vignetteDetail2Scroll = vec2.create();

  @io.persist
  @type.boolean
  vignetteShapePathEnabled = false;

  @io.persist
  @type.string
  vignetteShapePath = "";

  @io.persist
  @type.boolean
  vignetteDetailPathEnabled = false;

  @io.persist
  @type.string
  vignetteDetailPath = "";

  @io.persist
  @type.boolean
  vignetteSineFrequencyEnabled = false;

  @io.persist
  @type.float32
  vignetteSineFrequency = 0;

  @io.persist
  @type.boolean
  vignetteMinSineFrequencyEnabled = false;

  @io.persist
  @type.float32
  vignetteMinSineFrequency = 0;

  @io.persist
  @type.boolean
  vignetteMaxSineFrequencyEnabled = false;

  @io.persist
  @type.float32
  vignetteMaxSineFrequency = 0;

  @io.persist
  @type.boolean
  depthOfFieldScaleEnabled = false;

  @io.persist
  @type.float32
  depthOfFieldScale = 0;

  @io.persist
  @type.boolean
  depthOfFieldFocalDistanceEnabled = false;

  @io.persist
  @type.float32
  depthOfFieldFocalDistance = 0;

  @io.persist
  @type.boolean
  depthOfFieldFocalLengthEnabled = false;

  @io.persist
  @type.float32
  depthOfFieldFocalLength = 0;

  @io.persist
  @type.boolean
  depthOfFieldShapeEnabled = false;

  @io.persist
  @type.int32
  @type.enum("Shape")
  depthOfFieldShape = 0;

  @io.persist
  @type.boolean
  whiteTemperatureEnabled = false;

  @io.persist
  @type.float32
  whiteTemperature = 6500;

  @io.persist
  @type.boolean
  whiteTintEnabled = false;

  @io.persist
  @type.float32
  whiteTint = 0;

  @io.persist
  @type.boolean
  colorSaturationEnabled = false;

  @io.persist
  @type.float32
  colorSaturation = 1;

  @io.persist
  @type.boolean
  colorContrastEnabled = false;

  @io.persist
  @type.float32
  colorContrast = 1;

  @io.persist
  @type.boolean
  colorGammaEnabled = false;

  @io.persist
  @type.float32
  colorGamma = 1;

  @io.persist
  @type.boolean
  colorGainEnabled = false;

  @io.persist
  @type.vec3
  colorGain = vec3.fromValues(1, 1, 1);

  @io.persist
  @type.boolean
  colorOffsetEnabled = false;

  @io.persist
  @type.vec3
  colorOffset = vec3.create();

  // Native graph-only members: neither is Blue-exposed.
  prioritizedLuts = new Set();

  depthOfFieldForegroundBlurNeededEnabled = false;

  depthOfFieldForegroundBlurNeeded = false;

  /**
   * Restores every attribute to its default and clears its enable flag, then
   * deliberately re-enables the colour-correction attributes so entering a
   * volume does not interpolate white balance and grading up from zero.
   */
  @carbon.method
  @impl.implemented
  Reset()
  {
    this.intensity = 0;
    this.priority = Tr2PostProcessAttributes.MEDIUM_PRIORITY;
    for (const name of Tr2PostProcessAttributes.AttributeNames)
    {
      this[name] = Tr2PostProcessAttributes.CloneValue(Tr2PostProcessAttributes.DefaultValues[name]);
      this[`${name}Enabled`] = false;
    }
    this.prioritizedLuts.clear();

    // Carbon intentionally enables these on Reset to avoid interpolating color
    // correction from zero while entering a post-process volume.
    this.whiteTemperatureEnabled = true;
    this.whiteTintEnabled = true;
    this.colorSaturationEnabled = true;
    this.colorContrastEnabled = true;
    this.colorGammaEnabled = true;
    this.colorGainEnabled = true;
    this.colorOffsetEnabled = true;
  }

  /**
   * Captures an authored post-process graph as an attribute set, enabling only the attributes whose source effect passed its own availability gate; the LUT slot is taken from the highest-sorted available LUT.
   * @param {object} postProcess source graph, read through its Get*IfAvailable accessors; null leaves a reset attribute set
   * @param {number} priority the priority band this volume competes in
   * @param {number} intensity this volume's weight within its band
   */
  @carbon.method
  @impl.implemented
  FromPostProcess(postProcess, priority, intensity)
  {
    this.Reset();
    this.intensity = Number(intensity ?? 0);
    this.priority = Number(priority ?? Tr2PostProcessAttributes.MEDIUM_PRIORITY) | 0;
    if (!postProcess) return;

    const set = (name, value) => Tr2PostProcessAttributes.CopyValue(this, name, value, true);
    const signalLoss = postProcess.GetSignalLossIfAvailable?.() ?? null;
    if (signalLoss) set("signalLossIntensity", signalLoss.strength);

    const bloom = postProcess.GetBloomIfAvailable?.() ?? null;
    if (bloom)
    {
      set("bloomBrightness", bloom.brightness);
      set("bloomLuminanceScale", bloom.luminanceScale);
      set("bloomLuminanceThreshold", bloom.luminanceThreshold);
      set("grimeIntensity", bloom.grimeWeight);
      set("grimePath", bloom.grimePath);
      set("bloomSizeScale", bloom.sizeScale);
      set("bloomDirectionalWeight", bloom.directionalWeight);
      for (let index = 1; index <= 6; index++)
      {
        set(`bloomStepSize${index}`, bloom[`step${index}Size`] ?? bloom.stepSizes?.[index - 1]);
        set(`bloomStepTint${index}`, bloom[`step${index}Tint`] ?? bloom.stepTints?.[index - 1]);
      }
    }

    const filmGrain = postProcess.GetFilmGrainIfAvailable?.() ?? null;
    if (filmGrain)
    {
      set("filmGrainIntensity", filmGrain.intensity);
      set("filmGrainSize", filmGrain.grainSize);
      set("filmGrainDensity", filmGrain.grainDensity);
      set("filmGrainContrast", filmGrain.grainContrast);
      set("filmGrainBrightnessModifier", filmGrain.brightnessModifier);
      set("filmGrainColored", filmGrain.colored);
      set("filmGrainColorAmount", filmGrain.colorAmount);
    }

    const desaturate = postProcess.GetDesaturateIfAvailable?.() ?? null;
    if (desaturate) set("saturation", Number(desaturate.intensity) - 1);

    const fade = postProcess.GetFadeIfAvailable?.() ?? null;
    if (fade)
    {
      set("fadeIntensity", fade.intensity);
      set("fadeColor", fade.color);
    }

    const vignette = postProcess.GetVignetteIfAvailable?.() ?? null;
    if (vignette)
    {
      set("vignetteIntensity", vignette.intensity);
      set("vignetteOpacity", vignette.opacity);
      set("vignetteColor", vignette.color);
      set("vignetteDetail1Size", vignette.detail1Size);
      set("vignetteDetail1Scroll", vignette.detail1Scroll);
      set("vignetteDetail2Size", vignette.detail2Size);
      set("vignetteDetail2Scroll", vignette.detail2Scroll);
      set("vignetteShapePath", vignette.shapePath);
      set("vignetteDetailPath", vignette.detailPath);
      set("vignetteSineFrequency", vignette.sineFrequency);
      set("vignetteMinSineFrequency", vignette.sineMinimum);
      set("vignetteMaxSineFrequency", vignette.sineMaximum);
    }

    const depthOfField = postProcess.GetDepthOfFieldIfAvailable?.() ?? null;
    if (depthOfField)
    {
      set("depthOfFieldScale", depthOfField.scale);
      set("depthOfFieldFocalDistance", depthOfField.focalDistance);
      set("depthOfFieldFocalLength", depthOfField.focalLength);
      set("depthOfFieldShape", depthOfField.bokehShape);
    }

    const luts = postProcess.GetAvilableSortedLuts?.([]) ?? [];
    if (luts.length)
    {
      set("lutIntensity", luts[0].influence);
      set("lutPath", luts[0].path);
    }

    const colorCorrection = postProcess.GetColorCorrectionIfAvailable?.() ?? null;
    if (colorCorrection)
    {
      set("whiteTemperature", colorCorrection.whiteTemperature);
      set("whiteTint", colorCorrection.whiteTint);
      set("colorSaturation", colorCorrection.colorSaturation);
      set("colorContrast", colorCorrection.colorContrast);
      set("colorGamma", colorCorrection.colorGamma);
      set("colorGain", colorCorrection.colorGain);
      set("colorOffset", colorCorrection.colorOffset);
    }
  }

  static Priority = Priority;

  static AttributeType = AttributeType;

  static SCENE_DEFAULT_PRIORITY = 0;

  static LOW_PRIORITY = 1;

  static MEDIUM_PRIORITY = 2;

  static HIGH_PRIORITY = 3;

  static UI_PRIORITY = 4;

  static PRIORITY_COUNT = 5;

  static AttributeNames = Object.freeze([
    "signalLossIntensity",
    "bloomBrightness", "bloomLuminanceThreshold", "bloomLuminanceScale", "bloomSizeScale", "bloomDirectionalWeight",
    "bloomStepSize1", "bloomStepSize2", "bloomStepSize3", "bloomStepSize4", "bloomStepSize5", "bloomStepSize6",
    "bloomStepTint1", "bloomStepTint2", "bloomStepTint3", "bloomStepTint4", "bloomStepTint5", "bloomStepTint6",
    "grimeIntensity", "grimePath", "exposureAdjustment",
    "filmGrainIntensity", "filmGrainSize", "filmGrainDensity", "filmGrainContrast", "filmGrainBrightnessModifier", "filmGrainColored", "filmGrainColorAmount",
    "saturation", "fadeIntensity", "fadeColor", "lutIntensity", "lutPath",
    "vignetteIntensity", "vignetteOpacity", "vignetteColor", "vignetteDetail1Size", "vignetteDetail1Scroll", "vignetteDetail2Size", "vignetteDetail2Scroll",
    "vignetteShapePath", "vignetteDetailPath", "vignetteSineFrequency", "vignetteMinSineFrequency", "vignetteMaxSineFrequency",
    "depthOfFieldScale", "depthOfFieldFocalDistance", "depthOfFieldFocalLength", "depthOfFieldShape",
    "whiteTemperature", "whiteTint", "colorSaturation", "colorContrast", "colorGamma", "colorGain", "colorOffset"
  ]);

  static DefaultValues = Object.freeze({
    signalLossIntensity: 0,
    bloomBrightness: 0,
    bloomLuminanceThreshold: 0,
    bloomLuminanceScale: 0,
    bloomSizeScale: 4,
    bloomDirectionalWeight: 0,
    bloomStepSize1: 0.3,
    bloomStepSize2: 1,
    bloomStepSize3: 2,
    bloomStepSize4: 10,
    bloomStepSize5: 30,
    bloomStepSize6: 64,
    bloomStepTint1: vec4.fromValues(0.3465, 0.3465, 0.3465, 0.3465),
    bloomStepTint2: vec4.fromValues(0.138, 0.138, 0.138, 0.138),
    bloomStepTint3: vec4.fromValues(0.1176, 0.1176, 0.1176, 0.1176),
    bloomStepTint4: vec4.fromValues(0.066, 0.066, 0.066, 0.066),
    bloomStepTint5: vec4.fromValues(0.066, 0.066, 0.066, 0.066),
    bloomStepTint6: vec4.fromValues(0.061, 0.061, 0.061, 0.061),
    grimeIntensity: 0,
    grimePath: "",
    exposureAdjustment: 0,
    filmGrainIntensity: 0,
    filmGrainSize: 0,
    filmGrainDensity: 0,
    filmGrainContrast: 0,
    filmGrainBrightnessModifier: 0,
    filmGrainColored: false,
    filmGrainColorAmount: 0,
    saturation: 0,
    fadeIntensity: 0,
    fadeColor: vec4.fromValues(0, 0, 0, 1),
    lutIntensity: 0,
    lutPath: "",
    vignetteIntensity: 0,
    vignetteOpacity: 0,
    vignetteColor: vec4.fromValues(1, 1, 1, 1),
    vignetteDetail1Size: vec2.fromValues(16, 16),
    vignetteDetail1Scroll: vec2.create(),
    vignetteDetail2Size: vec2.fromValues(16, 16),
    vignetteDetail2Scroll: vec2.create(),
    vignetteShapePath: "",
    vignetteDetailPath: "",
    vignetteSineFrequency: 0,
    vignetteMinSineFrequency: 0,
    vignetteMaxSineFrequency: 0,
    depthOfFieldScale: 0,
    depthOfFieldFocalDistance: 0,
    depthOfFieldFocalLength: 0,
    depthOfFieldShape: 0,
    depthOfFieldForegroundBlurNeeded: false,
    whiteTemperature: 6500,
    whiteTint: 0,
    colorSaturation: 1,
    colorContrast: 1,
    colorGamma: 1,
    colorGain: vec3.fromValues(1, 1, 1),
    colorOffset: vec3.create()
  });

  static MaxWeightAttributes = Object.freeze(new Set([
    "grimePath", "filmGrainColored", "vignetteShapePath", "vignetteDetailPath", "depthOfFieldShape", "depthOfFieldForegroundBlurNeeded"
  ]));

  /**
   * Copies typed-array attribute values so callers never alias a shared default;
   * scalars, strings and booleans pass through unchanged.
   */
  static CloneValue(value)
  {
    return ArrayBuffer.isView(value) ? new value.constructor(value) : value;
  }

  /**
   * Writes an attribute value and its matching `<name>Enabled` flag together,
   * cloning the value first.
   */
  static CopyValue(target, name, value, enabled = true)
  {
    target[name] = Tr2PostProcessAttributes.CloneValue(value);
    target[`${name}Enabled`] = enabled;
  }

  /**
   * Accumulates value * weight into an accumulator, allocating a Float32Array on first use for vector attributes and adding numerically otherwise.
   * @param {*} result accumulator so far, or null to start a new one
   * @returns {*} the accumulator, which for vectors is the same array on later calls
   */
  static AddWeighted(result, value, weight)
  {
    if (ArrayBuffer.isView(value) || Array.isArray(value))
    {
      if (!result) result = new Float32Array(value.length);
      for (let index = 0; index < value.length; index++) result[index] += Number(value[index]) * weight;
      return result;
    }
    return Number(result ?? 0) + Number(value ?? 0) * weight;
  }

  /**
   * Returns the neutral starting value for an attribute, typed from its default:
   * a zeroed Float32Array, an empty string, false, or 0.
   */
  static ZeroValue(name)
  {
    const value = Tr2PostProcessAttributes.DefaultValues[name];
    if (ArrayBuffer.isView(value)) return new Float32Array(value.length);
    if (typeof value === "string") return "";
    if (typeof value === "boolean") return false;
    return 0;
  }

  /**
   * Creates the observer the accumulation passes report into, recording per
   * attribute which sources influenced it, at what weight, and the value that
   * came out; GetDict returns that record keyed by attribute name.
   */
  static CreateDebugObserver()
  {
    const records = {};
    let current = null;
    return {
      BeginAttribute(name)
      {
        current = { name, influencers: [] };
        records[name] = current;
      },
      Influence(attributes, weight)
      {
        current?.influencers.push({ attributes, weight });
      },
      EndAttribute(value)
      {
        if (current) current.value = Tr2PostProcessAttributes.CloneDebugValue(value);
        current = null;
      },
      GetDict()
      {
        return records;
      }
    };
  }

  /**
   * Snapshots a value into the debug record so later mutation of the accumulator
   * cannot rewrite what was reported.
   */
  static CloneDebugValue(value)
  {
    if (ArrayBuffer.isView(value)) return new value.constructor(value);
    if (Array.isArray(value)) return value.map(item => ({ ...item }));
    return value;
  }

  /**
   * Opens the debug record for one attribute; a null observer makes this a
   * no-op, which is the normal non-debug path.
   */
  static BeginDebug(observer, name)
  {
    observer?.BeginAttribute?.(name);
  }

  /**
   * Records that one source contributed to the open attribute at the given
   * weight.
   */
  static DebugInfluence(observer, source, weight)
  {
    observer?.Influence?.(source, weight);
  }

  /**
   * Closes the open attribute's debug record with the value the accumulation
   * produced.
   */
  static EndDebug(observer, value)
  {
    observer?.EndAttribute?.(value);
  }

  /**
   * Blends one attribute across the sources band by band: within a band the enabled sources' intensities are normalized against the weight still unspent, and the results are either summed or, for max-weight attributes, resolved to the single highest-weighted value. Bands stop contributing once the remaining weight is used up.
   * @param {Array} sources must already be ordered by priority - runs of equal priority are treated as one band
   * @param {boolean} [maxWeight] pick-one rather than sum; defaults to whether the attribute is in MaxWeightAttributes, which covers paths, enums and booleans that cannot be interpolated
   * @returns {*} a freshly cloned value, never an alias of a source
   */
  static Accumulate(name, sources, maxWeight = Tr2PostProcessAttributes.MaxWeightAttributes.has(name), observer = null)
  {
    let remainingWeight = 1;
    let result = maxWeight ? Tr2PostProcessAttributes.ZeroValue(name) : null;
    let bestWeight = 0;
    Tr2PostProcessAttributes.BeginDebug(observer, name);

    for (let first = 0; first < sources.length;)
    {
      let last = first + 1;
      while (last < sources.length && sources[last].priority === sources[first].priority) last++;

      let totalPriorityIntensity = 0;
      for (let index = first; index < last; index++)
      {
        if (sources[index]?.[`${name}Enabled`]) totalPriorityIntensity += Number(sources[index].intensity);
      }
      if (totalPriorityIntensity !== 0)
      {
        const normalization = remainingWeight / Math.max(totalPriorityIntensity, 1);
        for (let index = first; index < last; index++)
        {
          const source = sources[index];
          if (!source?.[`${name}Enabled`]) continue;
          const weight = Number(source.intensity) * normalization;
          if (maxWeight)
          {
            if (weight > bestWeight)
            {
              bestWeight = weight;
              result = source[name];
            }
          }
          else
          {
            result = Tr2PostProcessAttributes.AddWeighted(result, source[name], weight);
          }
          Tr2PostProcessAttributes.DebugInfluence(observer, source, weight);
        }
        remainingWeight -= totalPriorityIntensity;
        if (remainingWeight <= 0) break;
      }
      first = last;
    }
    const finalValue = Tr2PostProcessAttributes.CloneValue(result ?? Tr2PostProcessAttributes.ZeroValue(name));
    Tr2PostProcessAttributes.EndDebug(observer, finalValue);
    return finalValue;
  }

  /**
   * Blends LUT paths over the same priority bands as Accumulate, but keeps up to four distinct paths instead of one, merging repeats and ranking by weight.
   * @returns {Array<{value: string, weight: number}>} the kept paths, weights renormalized to sum to 1
   */
  static AccumulateLuts(sources, observer = null)
  {
    let remainingWeight = 1;
    const values = [];
    Tr2PostProcessAttributes.BeginDebug(observer, "lutPath");
    for (let first = 0; first < sources.length;)
    {
      let last = first + 1;
      while (last < sources.length && sources[last].priority === sources[first].priority) last++;
      let totalPriorityIntensity = 0;
      for (let index = first; index < last; index++)
      {
        if (sources[index]?.lutPathEnabled) totalPriorityIntensity += Number(sources[index].intensity);
      }
      if (totalPriorityIntensity !== 0)
      {
        const normalization = remainingWeight / Math.max(totalPriorityIntensity, 1);
        for (let index = first; index < last; index++)
        {
          const source = sources[index];
          if (!source?.lutPathEnabled) continue;
          const weight = Number(source.intensity) * normalization;
          const existing = values.find(item => item.value === source.lutPath);
          if (existing)
          {
            existing.weight += weight;
          }
          else if (values.length < 4)
          {
            values.push({ value: source.lutPath, weight });
            values.sort((a, b) => b.weight - a.weight);
          }
          else
          {
            const insertAt = values.findIndex(item => weight > item.weight);
            if (insertAt !== -1) values.splice(insertAt, 0, { value: source.lutPath, weight });
            values.length = 4;
          }
          Tr2PostProcessAttributes.DebugInfluence(observer, source, weight);
        }
        remainingWeight -= totalPriorityIntensity;
        if (remainingWeight <= 0) break;
      }
      first = last;
    }
    const total = values.reduce((sum, item) => sum + item.weight, 0);
    if (total > 0) for (const item of values) item.weight /= total;
    Tr2PostProcessAttributes.EndDebug(observer, values);
    return values;
  }

  /**
   * Installs an effect on a post-process through its Set<Name> method when it
   * has one, and otherwise by writing the lower-camel-case property of the same
   * name.
   */
  static SetEffect(postProcess, name, effect)
  {
    const method = postProcess[`Set${name}`];
    if (typeof method === "function") method.call(postProcess, effect);
    else postProcess[name.charAt(0).toLowerCase() + name.slice(1)] = effect;
  }

  /**
   * Rebuilds a post-process graph from blended attribute sources: every effect slot and the LUT list are cleared first, then only the effects whose driving attribute blended to a non-zero value are recreated, so a slot left empty means nothing asked for it.
   * @param {Array} sources attribute sets ordered by priority, as Accumulate requires
   * @returns {object} the same post-process instance that was passed in
   */
  static MergeInto(postProcess, sources, debugObserver = null)
  {
    const values = new Map();
    for (const name of Tr2PostProcessAttributes.AttributeNames)
    {
      if (name !== "lutPath") values.set(name, Tr2PostProcessAttributes.Accumulate(name, sources, undefined, debugObserver));
    }
    values.set("depthOfFieldForegroundBlurNeeded", Tr2PostProcessAttributes.Accumulate("depthOfFieldForegroundBlurNeeded", sources, true, debugObserver));
    const lutPaths = Tr2PostProcessAttributes.AccumulateLuts(sources, debugObserver);
    const value = name => values.get(name);
    Tr2PostProcessAttributes.SetEffect(postProcess, "Bloom", null);
    Tr2PostProcessAttributes.SetEffect(postProcess, "Desaturate", null);
    Tr2PostProcessAttributes.SetEffect(postProcess, "Fade", null);
    Tr2PostProcessAttributes.SetEffect(postProcess, "FilmGrain", null);
    Tr2PostProcessAttributes.SetEffect(postProcess, "SignalLoss", null);
    Tr2PostProcessAttributes.SetEffect(postProcess, "Vignette", null);
    Tr2PostProcessAttributes.SetEffect(postProcess, "DepthOfField", null);
    Tr2PostProcessAttributes.SetEffect(postProcess, "ColorCorrection", null);
    postProcess.ClearLuts?.();
    if (!postProcess.ClearLuts) postProcess.luts.length = 0;

    const signalLossIntensity = value("signalLossIntensity");
    if (signalLossIntensity > 0)
    {
      const effect = new Tr2PPSignalLossEffect();
      effect.strength = signalLossIntensity;
      Tr2PostProcessAttributes.SetEffect(postProcess, "SignalLoss", effect);
    }

    const bloomBrightness = value("bloomBrightness");
    if (bloomBrightness > 0)
    {
      const effect = new Tr2PPBloomEffect();
      effect.brightness = bloomBrightness;
      effect.luminanceThreshold = value("bloomLuminanceThreshold");
      effect.luminanceScale = value("bloomLuminanceScale");
      effect.sizeScale = value("bloomSizeScale");
      effect.directionalWeight = value("bloomDirectionalWeight");
      for (let index = 1; index <= 6; index++)
      {
        effect[`step${index}Size`] = value(`bloomStepSize${index}`);
        effect[`step${index}Tint`] = value(`bloomStepTint${index}`);
      }
      Tr2PostProcessAttributes.SetEffect(postProcess, "Bloom", effect);
    }

    const grimeIntensity = value("grimeIntensity");
    if (grimeIntensity > 0)
    {
      const effect = postProcess.GetBloomIfAvailable?.() ?? postProcess.bloom ?? new Tr2PPBloomEffect();
      effect.grimeWeight = grimeIntensity;
      effect.grimePath = value("grimePath");
      Tr2PostProcessAttributes.SetEffect(postProcess, "Bloom", effect);
    }

    const filmGrainIntensity = value("filmGrainIntensity");
    if (filmGrainIntensity > 0)
    {
      const effect = new Tr2PPFilmGrainEffect();
      effect.intensity = filmGrainIntensity;
      effect.grainSize = value("filmGrainSize");
      effect.grainDensity = value("filmGrainDensity");
      effect.grainContrast = value("filmGrainContrast");
      effect.brightnessModifier = value("filmGrainBrightnessModifier");
      effect.colored = value("filmGrainColored");
      effect.colorAmount = value("filmGrainColorAmount");
      Tr2PostProcessAttributes.SetEffect(postProcess, "FilmGrain", effect);
    }

    const saturation = value("saturation");
    if (saturation !== 0)
    {
      const effect = new Tr2PPDesaturateEffect();
      effect.intensity = saturation + 1;
      Tr2PostProcessAttributes.SetEffect(postProcess, "Desaturate", effect);
    }

    const fadeIntensity = value("fadeIntensity");
    if (fadeIntensity > 0)
    {
      const effect = new Tr2PPFadeEffect();
      effect.intensity = fadeIntensity;
      effect.color = value("fadeColor");
      Tr2PostProcessAttributes.SetEffect(postProcess, "Fade", effect);
    }

    const lutIntensity = value("lutIntensity");
    for (const lut of lutPaths)
    {
      const effect = new Tr2PPLutEffect();
      effect.influence = lut.weight * lutIntensity;
      effect.path = lut.value;
      if (postProcess.AddLut) postProcess.AddLut(effect);
      else postProcess.luts.push(effect);
    }

    const vignetteIntensity = value("vignetteIntensity");
    if (vignetteIntensity > 0)
    {
      const effect = new Tr2PPVignetteEffect();
      effect.intensity = vignetteIntensity;
      effect.opacity = value("vignetteOpacity");
      effect.color = value("vignetteColor");
      effect.detail1Size = value("vignetteDetail1Size");
      effect.detail1Scroll = value("vignetteDetail1Scroll");
      effect.detail2Size = value("vignetteDetail2Size");
      effect.detail2Scroll = value("vignetteDetail2Scroll");
      effect.shapePath = value("vignetteShapePath");
      effect.detailPath = value("vignetteDetailPath");
      effect.sineFrequency = value("vignetteSineFrequency");
      effect.sineMinimum = value("vignetteMinSineFrequency");
      effect.sineMaximum = value("vignetteMaxSineFrequency");
      Tr2PostProcessAttributes.SetEffect(postProcess, "Vignette", effect);
    }

    const depthOfFieldScale = value("depthOfFieldScale");
    if (depthOfFieldScale > 0)
    {
      const effect = new Tr2PPDepthOfFieldEffect();
      effect.scale = depthOfFieldScale;
      effect.cocScale = 1;
      effect.focalDistance = value("depthOfFieldFocalDistance");
      effect.focalLength = value("depthOfFieldFocalLength");
      effect.bokehShape = value("depthOfFieldShape");
      effect.foregroundBlurNeeded = value("depthOfFieldForegroundBlurNeeded");
      Tr2PostProcessAttributes.SetEffect(postProcess, "DepthOfField", effect);
    }

    postProcess.exposureAdjustment = value("exposureAdjustment");
    const whiteTemperature = value("whiteTemperature");
    if (whiteTemperature > 0)
    {
      const effect = new Tr2PPColorCorrectionEffect();
      effect.whiteTemperature = whiteTemperature;
      effect.whiteTint = value("whiteTint");
      effect.colorSaturation = value("colorSaturation");
      effect.colorContrast = value("colorContrast");
      effect.colorGamma = value("colorGamma");
      effect.colorGain = value("colorGain");
      effect.colorOffset = value("colorOffset");
      Tr2PostProcessAttributes.SetEffect(postProcess, "ColorCorrection", effect);
    }
    return postProcess;
  }

  static Shape = Tr2PPDepthOfFieldEffect.Shape;

}
