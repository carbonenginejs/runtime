import { CjsPngFormat } from "../resource/formats/png/CjsPngFormat.js";
import { CjsVtaFormat } from "../resource/formats/vta/CjsVtaFormat.js";
import { CjsGr2Format } from "../resource/formats/gr2/CjsGr2Format.js";
import { TriTextureRes } from "../trinity/resources/texture/TriTextureRes.js";
import { Tr2ImageRes } from "../trinity/resources/texture/Tr2ImageRes.js";
import { TriGeometryRes } from "../trinity/resources/geometry/TriGeometryRes.js";
import { Tr2EffectRes } from "../trinity/shader/Tr2EffectRes.js";
import { ReadImageResource } from "../trinity/resources/texture/registerTextureResources.js";
import { CreateShaderResourceLoader } from "../trinity/shader/registerShaderResources.js";
import { CreateBlackObjectBuilder } from "../global/blue/formats/black/CreateBlackObjectBuilder.js";
import { SolidColorTextureConstructor } from "../trinity/resources/procedural/SolidColorTextureConstructor.js";
import { CjsTextureArrayConstructor } from "../trinity/resources/texture/CjsTextureArrayConstructor.js";
import { CjsTexturePackConstructor } from "../trinity/resources/texture/CjsTexturePackConstructor.js";
import { CjsIESFormat } from "../resource/formats/ies/CjsIESFormat.js";
import { Tr2LightProfileRes } from "../trinity/resources/Tr2LightProfileRes.js";
import { TriGrannyRes } from "../trinity/resources/geometry/granny/TriGrannyRes.js";
import { BCN_CALLBACK_MODULES } from "../resource/codecs/bcn/carbon/dxtCompressionAsync.js";
import { IMAGE_DECODE_CALLBACK_MODULES } from "../resource/imageio/imageDecodeCallbacks.js";

const shaderLoader = CreateShaderResourceLoader();

/**
 * Explicit Trinity resource defaults. Importing this data installs nothing.
 * Loaders remain with their resource owners; backend translation and application
 * paths are supplied by the host. No service, worker or GPU device is constructed.
 */
export const DefaultConfiguration = {
  formats: {
    png: CjsPngFormat,
    vta: CjsVtaFormat
  },

  extensions: {
    dds: TriTextureRes,
    png: TriTextureRes,
    jpg: TriTextureRes,
    jpeg: TriTextureRes,
    tga: TriTextureRes,
    vta: TriTextureRes,
    gif: TriTextureRes,

    // Native factory suffix: the source remains .dds (Tr2ImageRes_Blue.cpp:16).
    ddsraw: Tr2ImageRes,
    pngraw: Tr2ImageRes,
    jpgraw: Tr2ImageRes,
    jpegraw: Tr2ImageRes,
    tgaraw: Tr2ImageRes,
    vtaraw: Tr2ImageRes,
    gifraw: Tr2ImageRes,

    // Carbon: Tr2LightProfileRes_Blue.cpp:25-26. No compression policy applies
    // to these R16F profile strips; the light-profile resource checks the bitmap.
    ddslp: Tr2LightProfileRes,
    ieslp: { Handler: Tr2LightProfileRes, Format: CjsIESFormat, defaults: { emit: "lightProfile" } },
    gr2raw: { Handler: TriGrannyRes, Format: CjsGr2Format, defaults: { emit: "json" } },

    sm_hi: Tr2EffectRes,
    sm_lo: Tr2EffectRes,
    sm_depth: Tr2EffectRes,
    sm_3_0_hi: Tr2EffectRes,
    sm_3_0_lo: Tr2EffectRes,
    sm_3_0_depth: Tr2EffectRes,
    sm_2_0_hi: Tr2EffectRes,
    sm_2_0_lo: Tr2EffectRes,
    sm_1_1: Tr2EffectRes,

    gr2: {
      Handler: TriGeometryRes,
      Format: CjsGr2Format,
      defaults: {
        emit: "json",
        rebuildMissingBounds: true
      }
    }
  },

  objectLoaders: {
    dds: ReadImageResource,
    png: ReadImageResource,
    jpg: ReadImageResource,
    jpeg: ReadImageResource,
    tga: ReadImageResource,
    vta: ReadImageResource,
    gif: ReadImageResource,
    ddsraw: ReadImageResource,
    pngraw: ReadImageResource,
    jpgraw: ReadImageResource,
    jpegraw: ReadImageResource,
    tgaraw: ReadImageResource,
    vtaraw: ReadImageResource,
    gifraw: ReadImageResource,
    ddslp: ReadImageResource,

    sm_hi: shaderLoader,
    sm_lo: shaderLoader,
    sm_depth: shaderLoader,
    sm_3_0_hi: shaderLoader,
    sm_3_0_lo: shaderLoader,
    sm_3_0_depth: shaderLoader,
    sm_2_0_hi: shaderLoader,
    sm_2_0_lo: shaderLoader,
    sm_1_1: shaderLoader
  },

  objectBuilders: {
    black: CreateBlackObjectBuilder,
    red: CreateBlackObjectBuilder
  },

  resourceConstructors: {
    color: SolidColorTextureConstructor,
    texturearray: CjsTextureArrayConstructor,
    texturepack: CjsTexturePackConstructor
  },

  imageHandlers: {
    png: CjsPngFormat,
    vta: CjsVtaFormat
  },

  // BeCallbackMan's callback modules, by callback name; see
  // BlueCallbackMan.RegisterCallbackModule.
  callbackModules: { ...BCN_CALLBACK_MODULES, ...IMAGE_DECODE_CALLBACK_MODULES },

  // How BeCallbackMan starts (Carbon: ResourceLoading.cpp:68-91). Carbon's
  // default thread count, (logical CPUs - 1) * 8 clamped to 4-24, sizes
  // blocking threads that resMan loading shares; here only CPU jobs run on it
  // and each thread is a worker, so the default is ours. workerModule
  // overrides the default worker entry, for bundled builds.
  // mainThreadTimeSlice bounds the tick that pumps it without workers, as
  // BlueResMan's own slice does (BlueResMan.cpp:77, 0.005 s).
  callbackMan: { useWorkers: true, threadCount: 2, mainThreadTimeSlice: 0.005 },

  paths: {},
  resMan: {},
  settings: {},
  backends: {}
};
