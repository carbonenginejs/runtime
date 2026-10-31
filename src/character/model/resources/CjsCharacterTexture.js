import { meta, type } from "#schema";

/** Character library value record; no resource decoding or character construction. */
@meta.define("CjsCharacterTexture")
export class CjsCharacterTexture
{

    /** Lookup name. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /** Original texture path; no selection or decoding. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.path
    resFilePath = "";

}
