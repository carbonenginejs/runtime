import { meta, type } from "#schema";

/**
 * One string in a list of the character library's data: Carbon's lists hold objects, not plain values, so a list of
 * strings is a list of these, as EveSOFDataGeneric's string vectors are.
 *
 * Modelled on: EveSOFDataGenericString (trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h:63-76)
 */
@meta.define("CjsCharacterDataString")
export class CjsCharacterDataString
{

    /** The string. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    str = "";

}
