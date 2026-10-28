import { CjsPngFormat } from "../resource/formats/png/CjsPngFormat.js";
import { CjsVtaFormat } from "../resource/formats/vta/CjsVtaFormat.js";
import { CjsGr2Format } from "../resource/formats/gr2/CjsGr2Format.js";
import { TriTextureRes } from "../trinity/resources/texture/TriTextureRes.js";
import { Tr2ImageRes } from "../trinity/resources/texture/Tr2ImageRes.js";
import { TriGeometryRes } from "../trinity/resources/geometry/TriGeometryRes.js";
import { Tr2EffectRes } from "../trinity/shader/Tr2EffectRes.js";
import { CreateBlackObjectBuilder } from "../global/blue/formats/black/CreateBlackObjectBuilder.js";
import { SolidColorTextureConstructor } from "../trinity/resources/procedural/SolidColorTextureConstructor.js";
import { CjsTextureArrayConstructor } from "../trinity/resources/texture/CjsTextureArrayConstructor.js";
import { CjsTexturePackConstructor } from "../trinity/resources/texture/CjsTexturePackConstructor.js";
import { CjsMeshConstructor } from "../trinity/resources/geometry/CjsMeshConstructor.js";
import { CjsIESFormat } from "../resource/formats/ies/CjsIESFormat.js";
import { Tr2LightProfileRes } from "../trinity/resources/Tr2LightProfileRes.js";
import { TriGrannyRes } from "../trinity/resources/geometry/granny/TriGrannyRes.js";
import { BCN_CALLBACK_MODULES } from "../resource/codecs/bcn/carbon/dxtCompressionAsync.js";
import { IMAGE_DECODE_CALLBACK_MODULES } from "../resource/imageio/imageDecodeCallbacks.js";

// Carbon stores these declarations with each Res class. CjsLibrary consumes
// this data through its existing configuration path; importing it registers nothing.
const textureExtensions = [...TriTextureRes.extensions, ...TriTextureRes.additionalExtensions]
  .filter(extension => !Object.hasOwn(TriTextureRes.unroutedExtensions, extension));
const imageExtensions = [...Tr2ImageRes.extensions, ...Tr2ImageRes.additionalExtensions]
  .filter(extension => !Object.hasOwn(Tr2ImageRes.unroutedExtensions, extension));
const shaderExtensions = [...Tr2EffectRes.extensions, ...Tr2EffectRes.additionalExtensions]
  .map(extension => extension.toLowerCase());
const geometryExtensions = TriGeometryRes.extensions
  .filter(extension => !Object.hasOwn(TriGeometryRes.unroutedExtensions, extension));

/**
 * Explicit Trinity resource defaults. Importing this data installs nothing.
 * Loaders remain with their resource owners; the effect translator and
 * application paths are supplied by the host. No service, worker or GPU device
 * is constructed.
 */
export const DefaultConfiguration = {
  formats: {
    png: CjsPngFormat,
    vta: CjsVtaFormat
  },

  extensions: {
    ...Object.fromEntries(textureExtensions.map(extension => [extension, TriTextureRes])),
    ...Object.fromEntries(imageExtensions.map(extension => [extension, Tr2ImageRes])),
    ...Object.fromEntries(shaderExtensions.map(extension => [extension, Tr2EffectRes])),
    ...Object.fromEntries(geometryExtensions.map(extension => [extension, {
      Handler: TriGeometryRes,
      Format: TriGeometryRes.extensionFormats[extension],
      defaults: TriGeometryRes.readOptions[extension]
    }])),

    // Carbon: Tr2LightProfileRes_Blue.cpp:25-26. Profile strips are never compressed.
    ddslp: Tr2LightProfileRes,
    ieslp: { Handler: Tr2LightProfileRes, Format: CjsIESFormat, defaults: { emit: "lightProfile" } },
    gr2raw: { Handler: TriGrannyRes, Format: CjsGr2Format, defaults: { emit: "json" } }
  },

  objectLoaders: {
    ...Object.fromEntries([...textureExtensions, ...imageExtensions, "ddslp"]
      .map(extension => [extension, TriTextureRes.readImageResource])),
    ...Object.fromEntries(shaderExtensions.map(extension => [extension, Tr2EffectRes.readShaderResource]))
  },

  // Carbon's LoadObject chooses its reader by header, so a YAML object file (a
  // character lighting rig) loads through the same builder (BlueResMan.cpp:806-840).
  objectBuilders: {
    black: CreateBlackObjectBuilder,
    red: CreateBlackObjectBuilder,
    yaml: CreateBlackObjectBuilder
  },

  resourceConstructors: {
    color: SolidColorTextureConstructor,
    texturearray: CjsTextureArrayConstructor,
    texturepack: CjsTexturePackConstructor,
    mesh: CjsMeshConstructor
  },

  imageHandlers: {
    bmp: TriTextureRes.extensionFormats.bmp,
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

  // Which effect tree shipped containers come from (`source`, e.g. "dx11"),
  // which backend they are prepared for (`target`, e.g. "webgpu"), the
  // translator between them, the shader model `/effect/` paths resolve to, and
  // whether translation is per permutation on demand or all at load. Committed
  // once, at startup: Tr2EffectRes.CommitBackend and SetEffectPathDefaults.
  effects: {},

  paths: {},
  resMan: {},
  settings: {},
  backends: {}
};
