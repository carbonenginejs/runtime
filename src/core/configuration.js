import { CjsPngFormat } from "../resource/formats/png/CjsPngFormat.js";
import { CjsVtaFormat } from "../resource/formats/vta/CjsVtaFormat.js";
import { CjsGr2Format } from "../resource/formats/gr2/CjsGr2Format.js";
import { TriTextureRes } from "../resource/texture/TriTextureRes.js";
import { Tr2ImageRes } from "../resource/texture/Tr2ImageRes.js";
import { TriGeometryRes } from "../resource/geometry/TriGeometryRes.js";
import { Tr2EffectRes } from "../resource/shader/Tr2EffectRes.js";
import { ReadImageResource } from "../resource/texture/registerTextureResources.js";
import { ReadShaderResource } from "../resource/shader/registerShaderResources.js";
import { CreateBlackObjectBuilder } from "../resource/object/registerObjectResources.js";
import { SolidColorTextureConstructor } from "../resource/texture/SolidColorTextureConstructor.js";
import { CjsTextureArrayConstructor } from "../resource/texture/CjsTextureArrayConstructor.js";
import { CjsTexturePackConstructor } from "../resource/texture/CjsTexturePackConstructor.js";
import { ResourceRequirement } from "../global/consts/resourceRequirement.js";

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

  resourceTypes: {
    [ResourceRequirement.TEXTURE]: TriTextureRes,
    [ResourceRequirement.IMAGE]: Tr2ImageRes
  },

  extensions: {
    dds: TriTextureRes,
    png: TriTextureRes,
    jpg: TriTextureRes,
    jpeg: TriTextureRes,
    tga: TriTextureRes,
    vta: TriTextureRes,
    gif: TriTextureRes,

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

    sm_hi: ReadShaderResource,
    sm_lo: ReadShaderResource,
    sm_depth: ReadShaderResource,
    sm_3_0_hi: ReadShaderResource,
    sm_3_0_lo: ReadShaderResource,
    sm_3_0_depth: ReadShaderResource,
    sm_2_0_hi: ReadShaderResource,
    sm_2_0_lo: ReadShaderResource,
    sm_1_1: ReadShaderResource
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

  paths: {},
  resMan: {},
  settings: {},
  backends: {}
};
