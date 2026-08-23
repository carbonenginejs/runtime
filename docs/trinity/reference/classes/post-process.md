# Post-process classes

Status: Evolving
Scope: `@carbonenginejs/runtime/trinity/postProcess`
Audience: Runtime and engine authors
Summary: Catalogs maintained post-process graph settings and execution boundaries.

<!-- class:Tr2SSAO -->
## `Tr2SSAO`

Owns Carbon's SSAO and CORTAO settings and their portable quality policy.

Physical filtering remains an explicit engine obligation.

- Export: `@carbonenginejs/runtime/trinity/postProcess`
- Source: `src/trinity/postProcess/Tr2SSAO.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2PostProcessRenderer -->
## `Tr2PostProcessRenderer`

Owns Carbon's post-process renderer quality and authored effect references.
Physical execution remains an explicit engine obligation.

- Export: `@carbonenginejs/runtime/trinity/postProcess`
- Source: `src/trinity/postProcess/Tr2PostProcessRenderer.js`
- Visibility: Public
- Kind: Carbon

<!-- class:BlurContext -->
## `BlurContext`

Describes one post-process blur variant and produces its stable cache key from type, channel, processing, and finalization modes.

- Export: `@carbonenginejs/runtime/trinity/postProcess`
- Source: `src/trinity/postProcess/BlurContext.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2PPBloomEffect -->
## `Tr2PPBloomEffect`

Six-step bloom parameters: per-step blur size and tint, overall brightness and size scale, luminance thresholding, and the grime texture overlaid on the result.

- Export: `@carbonenginejs/runtime/trinity/postProcess`
- Source: `src/trinity/postProcess/effect/Tr2PPBloomEffect.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2PPColorCorrectionEffect -->
## `Tr2PPColorCorrectionEffect`

Carries white-balance, saturation, contrast, gamma, gain, and offset settings for post-process color correction.

- Export: `@carbonenginejs/runtime/trinity/postProcess`
- Source: `src/trinity/postProcess/effect/Tr2PPColorCorrectionEffect.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2PPDepthOfFieldEffect -->
## `Tr2PPDepthOfFieldEffect`

Depth-of-field parameters - focal distance and length, circle-of-confusion and blur scale, bokeh shape - plus the process-wide switch that enables the effect at all.

- Export: `@carbonenginejs/runtime/trinity/postProcess`
- Source: `src/trinity/postProcess/effect/Tr2PPDepthOfFieldEffect.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2PPDesaturateEffect -->
## `Tr2PPDesaturateEffect`

Carries the intensity of a post-process desaturation effect.

- Export: `@carbonenginejs/runtime/trinity/postProcess`
- Source: `src/trinity/postProcess/effect/Tr2PPDesaturateEffect.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2PPDynamicExposureEffect -->
## `Tr2PPDynamicExposureEffect`

Carries the luminance range, adaptation speeds, brightness limits, and influence used for dynamic exposure.

- Export: `@carbonenginejs/runtime/trinity/postProcess`
- Source: `src/trinity/postProcess/effect/Tr2PPDynamicExposureEffect.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2PPEffect -->
## `Tr2PPEffect`

Provides the shared display gate for a post-process effect.

- Export: `@carbonenginejs/runtime/trinity/postProcess`
- Source: `src/trinity/postProcess/effect/Tr2PPEffect.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2PPFadeEffect -->
## `Tr2PPFadeEffect`

Carries the color and intensity of a display-gated post-process fade.

- Export: `@carbonenginejs/runtime/trinity/postProcess`
- Source: `src/trinity/postProcess/effect/Tr2PPFadeEffect.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2PPFilmGrainEffect -->
## `Tr2PPFilmGrainEffect`

Carries the density, size, contrast, color, brightness, and intensity settings for post-process film grain.

- Export: `@carbonenginejs/runtime/trinity/postProcess`
- Source: `src/trinity/postProcess/effect/Tr2PPFilmGrainEffect.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2PPFogEffect -->
## `Tr2PPFogEffect`

Carries the distance bands, color, nebula, brightness, and blending settings for post-process fog.

- Export: `@carbonenginejs/runtime/trinity/postProcess`
- Source: `src/trinity/postProcess/effect/Tr2PPFogEffect.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2PPGenericEffect -->
## `Tr2PPGenericEffect`

Post-process slot wrapping an arbitrary authored Tr2Effect together with the quality level it needs before a frame will run it.

- Export: `@carbonenginejs/runtime/trinity/postProcess`
- Source: `src/trinity/postProcess/effect/Tr2PPGenericEffect.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2PPGodRaysEffect -->
## `Tr2PPGodRaysEffect`

Carries the color, intensity, and noise texture used for post-process god rays.

- Export: `@carbonenginejs/runtime/trinity/postProcess`
- Source: `src/trinity/postProcess/effect/Tr2PPGodRaysEffect.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2PPLutEffect -->
## `Tr2PPLutEffect`

Carries a color lookup texture and influence for post-process grading.

- Export: `@carbonenginejs/runtime/trinity/postProcess`
- Source: `src/trinity/postProcess/effect/Tr2PPLutEffect.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2PPSignalLossEffect -->
## `Tr2PPSignalLossEffect`

Carries the strength of a display-gated post-process signal-loss effect.

- Export: `@carbonenginejs/runtime/trinity/postProcess`
- Source: `src/trinity/postProcess/effect/Tr2PPSignalLossEffect.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2PPTaaEffect -->
## `Tr2PPTaaEffect`

Temporal anti-aliasing settings: quality level, the early-out threshold below which pixels are left alone, and the debug visualization selector.

- Export: `@carbonenginejs/runtime/trinity/postProcess`
- Source: `src/trinity/postProcess/effect/Tr2PPTaaEffect.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2PPTonemappingEffect -->
## `Tr2PPTonemappingEffect`

Tonemapping curve selection - Uncharted2, ACES or AgX - together with the toe, shoulder and clipping parameters that shape it.

- Export: `@carbonenginejs/runtime/trinity/postProcess`
- Source: `src/trinity/postProcess/effect/Tr2PPTonemappingEffect.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2PPVignetteEffect -->
## `Tr2PPVignetteEffect`

Carries the shape, detail textures, scrolling, color, opacity, and oscillation settings for a post-process vignette.

- Export: `@carbonenginejs/runtime/trinity/postProcess`
- Source: `src/trinity/postProcess/effect/Tr2PPVignetteEffect.js`
- Visibility: Public
- Kind: Carbon

<!-- class:GaussianData -->
## `GaussianData`

Carries the packed weights, offsets, and tap count for one Gaussian blur pass.

- Export: `@carbonenginejs/runtime/trinity/postProcess`
- Source: `src/trinity/postProcess/GaussianData.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2PostProcess -->
## `Tr2PostProcess`

Post-process described as a flat ordered list of Tr2Effect stages, in contrast to Tr2PostProcess2's named effect slots.

- Export: `@carbonenginejs/runtime/trinity/postProcess`
- Source: `src/trinity/postProcess/Tr2PostProcess.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2PostProcess2 -->
## `Tr2PostProcess2`

The authored post-process chain as one slot per effect kind plus a LUT list, with per-effect quality thresholds deciding which of them a frame is allowed to use.

- Export: `@carbonenginejs/runtime/trinity/postProcess`
- Source: `src/trinity/postProcess/Tr2PostProcess2.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2PostProcessAttributes -->
## `Tr2PostProcessAttributes`

One post-process volume's contribution: a value and an enable flag per attribute, plus the priority band and intensity that weight it when several volumes are blended together.

- Export: `@carbonenginejs/runtime/trinity/postProcess`
- Source: `src/trinity/postProcess/Tr2PostProcessAttributes.js`
- Visibility: Public
- Kind: Carbon
