import { meta, type } from "#schema";

/**
 * One shader texture, by name: a generic area shader's default texture (`CjsCharacterDataShader`).
 *
 * Modelled on: EveSOFDataTexture (trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h:94-106)
 */
@meta.define("CjsCharacterDataTexture")
export class CjsCharacterDataTexture
{

    /** The effect resource's name (`FresnelLookupMap`). */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /** The texture's `res:` path. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    resFilePath = "";

}
