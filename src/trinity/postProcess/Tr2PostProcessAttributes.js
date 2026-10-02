// Source: trinity/trinity/PostProcess/Tr2PostProcessAttributes.h
// Source: trinity/trinity/PostProcess/Tr2PostProcessAttributes.cpp
// Source: trinity/trinity/PostProcess/Tr2PostProcessAttributes_Blue.cpp
import { vec2 } from "#math/vec2";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { meta } from "#schema";
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
import { blue, EnumRegistrationType } from "#blue";


/**
 * One post-process volume's contribution: a value and an enable flag per
 * attribute, plus the priority band and intensity that weight it when several
 * volumes are blended together.
 */
@meta.define({ className: "Tr2PostProcessAttributes", family: "postProcess" })
export class Tr2PostProcessAttributes
{

  /**
   * Priority band used to order volume blending; higher bands consume contribution weight before lower bands.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.int32
  @meta.type.enum("trinity.PostProcessEnums.Priority")
  priority = Tr2PostProcessAttributes.MEDIUM_PRIORITY;

  /**
   * Runtime volume contribution weight used to normalize enabled attributes within each priority band.
   * @type {number}
   */
  @meta.blue.read
  @meta.type.float32
  intensity = 0;

  /**
   * Includes this volume's signalLossIntensity setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  signalLossIntensityEnabled = false;

  /**
   * Strength sent to the signal-loss distortion effect; native authoring range is zero to one, without a clamp here.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  signalLossIntensity = 0;

  /**
   * Includes this volume's bloomBrightness setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  bloomBrightnessEnabled = false;

  /**
   * Multiplier controlling the bloom contribution added to the image.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  bloomBrightness = 0;

  /**
   * Includes this volume's bloomLuminanceThreshold setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  bloomLuminanceThresholdEnabled = false;

  /**
   * Brightness cutoff sent to the bloom high-pass filter to select bright image regions.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  bloomLuminanceThreshold = 0;

  /**
   * Includes this volume's bloomLuminanceScale setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  bloomLuminanceScaleEnabled = false;

  /**
   * Scale sent to the bloom high-pass filter for luminance above its threshold.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  bloomLuminanceScale = 0;

  /**
   * Includes this volume's bloomSizeScale setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  bloomSizeScaleEnabled = false;

  /**
   * Global bloom-radius factor; radius is mip maximum dimension times this factor times the step size times 0.01.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  bloomSizeScale = 4;

  /**
   * Includes this volume's bloomDirectionalWeight setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  bloomDirectionalWeightEnabled = false;

  /**
   * Bloom shape control: negative selects a horizontal flare, positive a cross, and zero no directional shape.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  bloomDirectionalWeight = 0;

  /**
   * Includes this volume's bloomStepSize1 setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  bloomStepSize1Enabled = false;

  /**
   * Radius factor for bloom stage 1; multiplied by bloomSizeScale and the current mip maximum dimension times 0.01.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  bloomStepSize1 = 0.3;

  /**
   * Includes this volume's bloomStepSize2 setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  bloomStepSize2Enabled = false;

  /**
   * Radius factor for bloom stage 2; multiplied by bloomSizeScale and the current mip maximum dimension times 0.01.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  bloomStepSize2 = 1;

  /**
   * Includes this volume's bloomStepSize3 setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  bloomStepSize3Enabled = false;

  /**
   * Radius factor for bloom stage 3; multiplied by bloomSizeScale and the current mip maximum dimension times 0.01.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  bloomStepSize3 = 2;

  /**
   * Includes this volume's bloomStepSize4 setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  bloomStepSize4Enabled = false;

  /**
   * Radius factor for bloom stage 4; multiplied by bloomSizeScale and the current mip maximum dimension times 0.01.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  bloomStepSize4 = 10;

  /**
   * Includes this volume's bloomStepSize5 setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  bloomStepSize5Enabled = false;

  /**
   * Radius factor for bloom stage 5; multiplied by bloomSizeScale and the current mip maximum dimension times 0.01.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  bloomStepSize5 = 30;

  /**
   * Includes this volume's bloomStepSize6 setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  bloomStepSize6Enabled = false;

  /**
   * Radius factor for bloom stage 6; multiplied by bloomSizeScale and the current mip maximum dimension times 0.01.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  bloomStepSize6 = 64;

  /**
   * Includes this volume's bloomStepTint1 setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  bloomStepTint1Enabled = false;

  /**
   * Four-component color weight for bloom stage 1; its RGB channels tint that stage's Gaussian blur contribution.
   * @type {Float32Array}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  bloomStepTint1 = vec4.fromValues(0.3465, 0.3465, 0.3465, 0.3465);

  /**
   * Includes this volume's bloomStepTint2 setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  bloomStepTint2Enabled = false;

  /**
   * Four-component color weight for bloom stage 2; its RGB channels tint that stage's Gaussian blur contribution.
   * @type {Float32Array}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  bloomStepTint2 = vec4.fromValues(0.138, 0.138, 0.138, 0.138);

  /**
   * Includes this volume's bloomStepTint3 setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  bloomStepTint3Enabled = false;

  /**
   * Four-component color weight for bloom stage 3; its RGB channels tint that stage's Gaussian blur contribution.
   * @type {Float32Array}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  bloomStepTint3 = vec4.fromValues(0.1176, 0.1176, 0.1176, 0.1176);

  /**
   * Includes this volume's bloomStepTint4 setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  bloomStepTint4Enabled = false;

  /**
   * Four-component color weight for bloom stage 4; its RGB channels tint that stage's Gaussian blur contribution.
   * @type {Float32Array}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  bloomStepTint4 = vec4.fromValues(0.066, 0.066, 0.066, 0.066);

  /**
   * Includes this volume's bloomStepTint5 setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  bloomStepTint5Enabled = false;

  /**
   * Four-component color weight for bloom stage 5; its RGB channels tint that stage's Gaussian blur contribution.
   * @type {Float32Array}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  bloomStepTint5 = vec4.fromValues(0.066, 0.066, 0.066, 0.066);

  /**
   * Includes this volume's bloomStepTint6 setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  bloomStepTint6Enabled = false;

  /**
   * Four-component color weight for bloom stage 6; its RGB channels tint that stage's Gaussian blur contribution.
   * @type {Float32Array}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  bloomStepTint6 = vec4.fromValues(0.061, 0.061, 0.061, 0.061);

  /**
   * Includes this volume's grimeIntensity setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  grimeIntensityEnabled = false;

  /**
   * Weight of the lens-grime texture in the bloom effect.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  grimeIntensity = 0;

  /**
   * Includes this volume's grimePath setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  grimePathEnabled = false;

  /**
   * Lens-grime texture resource path, selected from the strongest weighted contributor rather than interpolated.
   * @type {string}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.path
  grimePath = "";

  /**
   * Includes this volume's exposureAdjustment setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  exposureAdjustmentEnabled = false;

  /**
   * Manual exposure compensation in stops; the renderer converts it to a power-of-two multiplier.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  exposureAdjustment = 0;

  /**
   * Includes this volume's filmGrainIntensity setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  filmGrainIntensityEnabled = false;

  /**
   * Blend strength of the film-grain effect in the output image.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  filmGrainIntensity = 0;

  /**
   * Includes this volume's filmGrainSize setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  filmGrainSizeEnabled = false;

  /**
   * Grain size in pixels, sent as GrainSize; also affects the reciprocal grain-edge parameter.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  filmGrainSize = 0;

  /**
   * Includes this volume's filmGrainDensity setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  filmGrainDensityEnabled = false;

  /**
   * Noise coverage control; the renderer sends one minus this value as GrainThreshold.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  filmGrainDensity = 0;

  /**
   * Includes this volume's filmGrainContrast setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  filmGrainContrastEnabled = false;

  /**
   * Grain-edge contrast control; the renderer sends 1 / (contrast * grain size) as GrainEdge.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  filmGrainContrast = 0;

  /**
   * Includes this volume's filmGrainBrightnessModifier setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  filmGrainBrightnessModifierEnabled = false;

  /**
   * Controls grain in bright pixels: negative reduces noise intensity and positive increases it.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  filmGrainBrightnessModifier = 0;

  /**
   * Includes this volume's filmGrainColored setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  filmGrainColoredEnabled = false;

  /**
   * Selects colored rather than monochrome grain; blending chooses the strongest weighted contributor.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  filmGrainColored = false;

  /**
   * Includes this volume's filmGrainColorAmount setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  filmGrainColorAmountEnabled = false;

  /**
   * Amount of color variation supplied to the colored-grain shader.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  filmGrainColorAmount = 0;

  /**
   * Includes this volume's saturation setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  saturationEnabled = false;

  /**
   * Signed adjustment for the separate desaturation effect: negative desaturates and positive increases saturation.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  saturation = 0;

  /**
   * Includes this volume's fadeIntensity setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  fadeIntensityEnabled = false;

  /**
   * Blend amount for fading the image toward fadeColor.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  fadeIntensity = 0;

  /**
   * Includes this volume's fadeColor setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  fadeColorEnabled = false;

  /**
   * RGBA target color supplied to the fade effect.
   * @type {Float32Array}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  fadeColor = vec4.fromValues(0, 0, 0, 1);

  /**
   * Includes this volume's lutIntensity setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  lutIntensityEnabled = false;

  /**
   * Influence of color grading through the blended lookup tables.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  lutIntensity = 0;

  /**
   * Includes this volume's lutPath setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  lutPathEnabled = false;

  /**
   * Color lookup-table resource path; accumulation retains and weights up to four paths rather than interpolating strings.
   * @type {string}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.path
  lutPath = "";

  /**
   * Includes this volume's vignetteIntensity setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  vignetteIntensityEnabled = false;

  /**
   * Additive vignette intensity, supplied separately from opacity to the shader.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  vignetteIntensity = 0;

  /**
   * Includes this volume's vignetteOpacity setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  vignetteOpacityEnabled = false;

  /**
   * Opacity component sent with intensity to the vignette shader.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  vignetteOpacity = 0;

  /**
   * Includes this volume's vignetteColor setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  vignetteColorEnabled = false;

  /**
   * RGBA tint supplied to the vignette shader.
   * @type {Float32Array}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  vignetteColor = vec4.fromValues(1, 1, 1, 1);

  /**
   * Includes this volume's vignetteDetail1Size setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  vignetteDetail1SizeEnabled = false;

  /**
   * Two-component size of the first vignette detail layer in pixels, passed directly to the shader.
   * @type {Float32Array}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec2
  vignetteDetail1Size = vec2.fromValues(16, 16);

  /**
   * Includes this volume's vignetteDetail1Scroll setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  vignetteDetail1ScrollEnabled = false;

  /**
   * Two-component scrolling control for the first vignette detail layer; shader-domain values with no physical units specified here.
   * @type {Float32Array}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec2
  vignetteDetail1Scroll = vec2.create();

  /**
   * Includes this volume's vignetteDetail2Size setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  vignetteDetail2SizeEnabled = false;

  /**
   * Two-component size of the second vignette detail layer in pixels, passed directly to the shader.
   * @type {Float32Array}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec2
  vignetteDetail2Size = vec2.fromValues(16, 16);

  /**
   * Includes this volume's vignetteDetail2Scroll setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  vignetteDetail2ScrollEnabled = false;

  /**
   * Two-component scrolling control for the second vignette detail layer; shader-domain values with no physical units specified here.
   * @type {Float32Array}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec2
  vignetteDetail2Scroll = vec2.create();

  /**
   * Includes this volume's vignetteShapePath setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  vignetteShapePathEnabled = false;

  /**
   * Vignette shape texture resource path, chosen by greatest contribution weight rather than interpolation.
   * @type {string}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.path
  vignetteShapePath = "";

  /**
   * Includes this volume's vignetteDetailPath setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  vignetteDetailPathEnabled = false;

  /**
   * Vignette detail texture resource path, chosen by greatest contribution weight rather than interpolation.
   * @type {string}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.path
  vignetteDetailPath = "";

  /**
   * Includes this volume's vignetteSineFrequency setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  vignetteSineFrequencyEnabled = false;

  /**
   * Frequency control for vignette sine modulation, sent directly to the shader; no hertz conversion is specified here.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  vignetteSineFrequency = 0;

  /**
   * Includes this volume's vignetteMinSineFrequency setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  vignetteMinSineFrequencyEnabled = false;

  /**
   * Lower sine-modulation range endpoint, mapped to sineMinimum despite this field name; not a second frequency.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  vignetteMinSineFrequency = 0;

  /**
   * Includes this volume's vignetteMaxSineFrequency setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  vignetteMaxSineFrequencyEnabled = false;

  /**
   * Upper sine-modulation range endpoint, mapped to sineMaximum despite this field name; not a second frequency.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  vignetteMaxSineFrequency = 0;

  /**
   * Includes this volume's depthOfFieldScale setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  depthOfFieldScaleEnabled = false;

  /**
   * Blur-strength scale supplied with focal distance and focal length to the circle-of-confusion pass.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  depthOfFieldScale = 0;

  /**
   * Includes this volume's depthOfFieldFocalDistance setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  depthOfFieldFocalDistanceEnabled = false;

  /**
   * Distance of the focus plane supplied to the circle-of-confusion shader; uses its scene-depth convention, with no unit conversion here.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  depthOfFieldFocalDistance = 0;

  /**
   * Includes this volume's depthOfFieldFocalLength setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  depthOfFieldFocalLengthEnabled = false;

  /**
   * Distance from the focal plane at which an object becomes fully out of focus; scene-distance units are not specified here.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  depthOfFieldFocalLength = 0;

  /**
   * Includes this volume's depthOfFieldShape setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  depthOfFieldShapeEnabled = false;

  /**
   * Bokeh Shape enum selecting the blur kernel; the strongest contributor wins instead of averaging enum values.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.int32
  @meta.type.enum("trinity.Tr2Bokeh.Shape")
  depthOfFieldShape = 0;

  /**
   * Includes this volume's whiteTemperature setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  whiteTemperatureEnabled = false;

  /**
   * White-balance color temperature in kelvin for the color-correction effect.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  whiteTemperature = 6500;

  /**
   * Includes this volume's whiteTint setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  whiteTintEnabled = false;

  /**
   * White-balance tint adjustment paired with temperature; native authoring range is -1 to 1.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  whiteTint = 0;

  /**
   * Includes this volume's colorSaturation setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  colorSaturationEnabled = false;

  /**
   * Color-grading saturation multiplier, distinct from the separate signed desaturation adjustment.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  colorSaturation = 1;

  /**
   * Includes this volume's colorContrast setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  colorContrastEnabled = false;

  /**
   * Color-grading contrast control passed to the correction effect; one is the neutral default.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  colorContrast = 1;

  /**
   * Includes this volume's colorGamma setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  colorGammaEnabled = false;

  /**
   * Color-grading gamma control passed to the correction effect; one is the neutral default.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  colorGamma = 1;

  /**
   * Includes this volume's colorGain setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  colorGainEnabled = false;

  /**
   * Three-channel RGB gain for color grading, with a neutral value of one per channel.
   * @type {Float32Array}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  colorGain = vec3.fromValues(1, 1, 1);

  /**
   * Includes this volume's colorOffset setting in priority-weighted accumulation; false excludes its value and intensity from that attribute's blend.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  colorOffsetEnabled = false;

  /**
   * Three-channel RGB offset for color grading, with a neutral value of zero per channel.
   * @type {Float32Array}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  colorOffset = vec3.create();

  /**
   * Reserved runtime LUT-priority scratch set, cleared by Reset. Native stores weight/path pairs; the current JS merge instead uses local records and does not populate this set.
   * @type {Set<unknown>}
   */
  prioritizedLuts = new Set();

  /**
   * Includes this volume in strongest-contributor selection for foreground blur; runtime-only and not Blue-persisted.
   * @type {boolean}
   */
  depthOfFieldForegroundBlurNeededEnabled = false;

  /**
   * Requests foreground depth-of-field blur on the merged effect; selected by contribution weight, not numerically interpolated.
   * @type {boolean}
   */
  depthOfFieldForegroundBlurNeeded = false;

  /**
   * Restores every attribute to its default and clears its enable flag, then
   * deliberately re-enables the colour-correction attributes so entering a
   * volume does not interpolate white balance and grading up from zero.
   */
  @meta.blue.method
  @meta.implemented
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
   * Retains JavaScript optional getter calls, default/coercion handling and
   * alternate bloom arrays for non-native graph shapes. These non-update
   * adapters leave the established extraction algorithm unchanged.
   * Captures an authored post-process graph as an attribute set, enabling only the attributes whose source effect passed its own availability gate; the LUT slot is taken from the highest-sorted available LUT.
   * @param {object} postProcess source graph, read through its Get*IfAvailable accessors; null leaves a reset attribute set
   * @param {number} priority the priority band this volume competes in
   * @param {number} intensity this volume's weight within its band
   */
  @meta.blue.method
  @meta.adapted
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

  /**
   * Native priority enum values used to group and order volume contributions.
   * @type {Object<string, number>}
   */
  static Priority = Priority;

  /**
   * Legacy generated attribute-kind enum; its entries do not form a one-to-one index of the current AttributeNames list.
   * @type {Object<string, number>}
   */
  static AttributeType = AttributeType;

  /**
   * Lowest contribution band, used for scene defaults after higher-priority volumes.
   * @type {number}
   */
  static SCENE_DEFAULT_PRIORITY = 0;

  /**
   * Low-priority contribution band above scene defaults.
   * @type {number}
   */
  static LOW_PRIORITY = 1;

  /**
   * Default volume contribution band between low and high priority.
   * @type {number}
   */
  static MEDIUM_PRIORITY = 2;

  /**
   * High-priority contribution band below the UI band.
   * @type {number}
   */
  static HIGH_PRIORITY = 3;

  /**
   * Highest contribution band, reserved for UI post-processing overrides.
   * @type {number}
   */
  static UI_PRIORITY = 4;

  /**
   * Number of supported priority bands, excluding this count sentinel.
   * @type {number}
   */
  static PRIORITY_COUNT = 5;

  /**
   * Ordered names traversed when resetting, extracting and merging the paired value/enable attributes.
   * @type {ReadonlyArray<string>}
   */
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

  /**
   * Defaults cloned by Reset and used to select zero-value types; the object is frozen but its vector buffers remain mutable.
   * @type {Readonly<Object<string, number|boolean|string|Float32Array>>}
   */
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

  /**
   * Names whose values are selected by strongest contribution instead of summed; Object.freeze does not prevent Set membership changes.
   * @type {Set<string>}
   */
  static MaxWeightAttributes = Object.freeze(new Set([
    "grimePath", "filmGrainColored", "vignetteShapePath", "vignetteDetailPath", "depthOfFieldShape", "depthOfFieldForegroundBlurNeeded"
  ]));

  /**
   * Copies typed-array attribute values so callers never alias a shared default;
   * scalars, strings and booleans pass through unchanged.
   */
  @meta.ours
  static CloneValue(value)
  {
    return ArrayBuffer.isView(value) ? new value.constructor(value) : value;
  }

  /**
   * Writes an attribute value and its matching `<name>Enabled` flag together,
   * cloning the value first.
   */
  @meta.ours
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
  @meta.ours
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
  @meta.ours
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
  @meta.ours
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
  @meta.ours
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
  @meta.ours
  static BeginDebug(observer, name)
  {
    observer?.BeginAttribute?.(name);
  }

  /**
   * Records that one source contributed to the open attribute at the given
   * weight.
   */
  @meta.ours
  static DebugInfluence(observer, source, weight)
  {
    observer?.Influence?.(source, weight);
  }

  /**
   * Closes the open attribute's debug record with the value the accumulation
   * produced.
   */
  @meta.ours
  static EndDebug(observer, value)
  {
    observer?.EndAttribute?.(value);
  }

  /**
   * Blends one attribute across the sources band by band: within a band the enabled sources' intensities are normalized against the weight still unspent, and the results are either summed or, for max-weight attributes, resolved to the single highest-weighted value. Bands stop contributing once the remaining weight is used up.
   * Adapts the native anonymous-namespace/PriorityBlend templates to dynamic
   * member names, JavaScript arrays, numeric coercion and optional observers.
   * @param {Array} sources must already be ordered by priority - runs of equal priority are treated as one band
   * @param {boolean} [maxWeight] pick-one rather than sum; defaults to whether the attribute is in MaxWeightAttributes, which covers paths, enums and booleans that cannot be interpolated
   * @returns {*} a freshly cloned value, never an alias of a source
   */
  @meta.adapted
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
   * Adapts the native PriorityBlend LUT accumulator to JavaScript value records
   * and the existing optional debug-observer interface.
   * @returns {Array<{value: string, weight: number}>} the kept paths, weights renormalized to sum to 1
   */
  @meta.adapted
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
  @meta.ours
  static SetEffect(postProcess, name, effect)
  {
    const method = postProcess[`Set${name}`];
    if (typeof method === "function") method.call(postProcess, effect);
    else postProcess[name.charAt(0).toLowerCase() + name.slice(1)] = effect;
  }

  /**
   * Retains the JavaScript dynamic attribute/Map representation, optional
   * observers, setter/property fallbacks and direct effect-field assignment.
   * These established non-update adapters do not claim renderer parity.
   * Rebuilds a post-process graph from blended attribute sources: every effect slot and the LUT list are cleared first, then only the effects whose driving attribute blended to a non-zero value are recreated, so a slot left empty means nothing asked for it.
   * @param {Array} sources attribute sets ordered by priority, as Accumulate requires
   * @returns {object} the same post-process instance that was passed in
   */
  @meta.blue.method
  @meta.adapted
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

  /**
   * Shared bokeh-shape enum from the depth-of-field effect, used by depthOfFieldShape.
   * @type {Object<string, number>}
   */
  static Shape = Tr2PPDepthOfFieldEffect.Shape;

}

// Carbon's chooser lists the priorities highest first and omits PRIORITY_COUNT.
blue.enums.RegisterEnum("trinity.PostProcessEnums.Priority", Priority, {
  source: "trinity/trinity/PostProcess/Tr2PostProcessEnums.h", family: "postProcess", line: 58,
  exposedName: "Tr2PostProcessPriority", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/PostProcess/Tr2PostProcessAttributes_Blue.cpp:9",
  chooser: [
    { name: "UI", value: Priority.UI_PRIORITY, description: "UI (Top) Priority" },
    { name: "High", value: Priority.HIGH_PRIORITY, description: "High Priority" },
    { name: "Medium", value: Priority.MEDIUM_PRIORITY, description: "Medium Priority" },
    { name: "Low", value: Priority.LOW_PRIORITY, description: "Low Priority" },
    { name: "SceneDefault", value: Priority.SCENE_DEFAULT_PRIORITY, description: "Scene Default (lowest) Priority" }
  ]
});

meta.blue.interfaceTable({ interfaces: [ Tr2PostProcessAttributes ], chainTo: null })(Tr2PostProcessAttributes);
