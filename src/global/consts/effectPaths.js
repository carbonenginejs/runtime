// Source: trinity/trinity/Tr2Blitter.cpp (BLIT_EFFECT_PATH, BLIT_FILTERED_EFFECT_PATH)
// Source: trinity/trinity/PostProcess/Tr2PostProcessRenderer.cpp (the constructor's paths)
//
// The effect paths Trinity's own classes create effects from, as Carbon spells
// them. Shared from here so any layer - a host preloading them, a tool listing
// what a frame needs, a test - names the same files the classes load.

/** Carbon's two blit effect paths (`Tr2Blitter.cpp:11-12`). */
export const BLIT_EFFECT_PATH = "res:/Graphics/Effect/Managed/space/system/Blit.fx";
export const BLIT_FILTERED_EFFECT_PATH = "res:/Graphics/Effect/Managed/space/system/BlitFiltered.fx";

/** The lens-flare occlusion buffer's compute effect (`EveOccluder.cpp:18`): Clear and CopyCounters. */
export const OCCLUDER_MANAGEMENT_EFFECT_PATH = "res:/Graphics/Effect/Managed/Space/SpecialFX/Lensflares/OccluderManagement.fx";

const POST_PROCESS = "res:/Graphics/Effect/Managed/Space/PostProcess/";

/**
 * The effects `Tr2PostProcessRenderer`'s constructor and passes create
 * (`Tr2PostProcessRenderer.cpp:537-635, 1256-1259, 911-921`), keyed by file.
 */
export const PostProcessEffectPaths = Object.freeze({
  ToneMapping: POST_PROCESS + "ToneMapping.fx",
  ReactiveMask: POST_PROCESS + "ReactiveMask.fx",
  TransparencyMask: POST_PROCESS + "TransparencyMask.fx",
  HighPassFilter: POST_PROCESS + "HighPassFilter.fx",
  Downsample: POST_PROCESS + "Downsample.fx",
  Upsample: POST_PROCESS + "Upsample.fx",
  ExposureToTexture: POST_PROCESS + "ExposureToTexture.fx",
  CreateHistograms: POST_PROCESS + "CreateHistograms.fx",
  MergeHistograms: POST_PROCESS + "MergeHistograms.fx",
  MeasureExposure: POST_PROCESS + "MeasureExposure.fx",
  ExposureDebug: POST_PROCESS + "ExposureDebug.fx",
  CAS: POST_PROCESS + "CAS.fx",
  DownsampleDepth: POST_PROCESS + "DownsampleDepth.fx",
  EnvironmentFogColor: POST_PROCESS + "EnvironmentFogColor.fx",
  EnvironmentFogComposit: POST_PROCESS + "EnvironmentFogComposit.fx",
  Bokeh: POST_PROCESS + "Bokeh.fx",
  BokehTAA: POST_PROCESS + "BokehTAA.fx",
  CircleOfConfusion: POST_PROCESS + "CircleOfConfusion.fx",
  Godrays: POST_PROCESS + "Godrays.fx",
  SignalLoss: POST_PROCESS + "SignalLoss.fx",
  FilmGrain: POST_PROCESS + "FilmGrain.fx",
  TAA: POST_PROCESS + "TAA.fx",
  TAACopy: POST_PROCESS + "TAACopy.fx",
  Blur: POST_PROCESS + "Blur.fx"
});
