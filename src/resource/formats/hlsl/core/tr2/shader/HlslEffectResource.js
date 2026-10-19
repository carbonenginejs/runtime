import { CjsSchema } from "#schema/CjsSchema";

import { HlslRenderContextEnum } from "../HlslRenderContextEnum.js";

/**
 * Shader resource or UAV metadata read from a Trinity effect body.
 */
export class HlslEffectResource
{
    static Type = Object.freeze({
        TEXTURE_1D: HlslRenderContextEnum.TEX_TYPE_1D,
        TEXTURE_2D: HlslRenderContextEnum.TEX_TYPE_2D,
        TEXTURE_3D: HlslRenderContextEnum.TEX_TYPE_3D,
        TEXTURE_CUBE: HlslRenderContextEnum.TEX_TYPE_CUBE,
        TEXTURE_TYPELESS: HlslRenderContextEnum.TEX_TYPE_TYPELESS,
        BUFFER: 6,
        STRUCTURED_BUFFER: 7,
        TBUFFER: 8,
        BYTEADDRESS_BUFFER: 9,
        UAV_RWTYPED: 10,
        UAV_RWSTRUCTURED: 11,
        UAV_RWBYTEADDRESS: 12,
        UAV_APPEND_STRUCTURED: 13,
        UAV_CONSUME_STRUCTURED: 14,
        UAV_RWSTRUCTURED_WITH_COUNTER: 15,
        BINDLESS_SAMPLER: 100
    });

    /**
     * Resource name (Shader/Tr2EffectDescription.h:96). Carbon leaves it unset.
     * @type {string}
     */
    name = "";

    /**
     * Resource type (Shader/Tr2EffectDescription.h:98). Carbon leaves it unset; ours starts as TEXTURE_2D.
     * @type {number}
     */
    type = HlslEffectResource.Type.TEXTURE_2D;

    /**
     * Array element count (Shader/Tr2EffectDescription.h:99); the wire's own default is 1 (shadercompiler/EffectData.h:361).
     * @type {number}
     */
    arrayElements = 1;

    /**
     * sRGB-to-linear request (Shader/Tr2EffectDescription.h:101). Carbon leaves it unset.
     * @type {boolean}
     */
    isSRGB = false;

    /**
     * Autoregister annotation value (Shader/Tr2EffectDescription.h:103). Carbon leaves it unset.
     * @type {boolean}
     */
    isAutoregister = false;

    /**
   * Returns a JSON-safe resource metadata snapshot.
   *
   * @returns {object} Serializable resource metadata.
   */
    toJSON()
    {
        return { ...this };
    }
}

CjsSchema.meta.define(HlslEffectResource, { className: "HlslEffectResource", donors: [ "Tr2EffectResource" ] });
