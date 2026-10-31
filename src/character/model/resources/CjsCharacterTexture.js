import { meta, type } from "#schema";

/** Character library value record; no resource decoding or character construction. */
@meta.define("CjsCharacterTexture")
export class CjsCharacterTexture
{

    /** Lookup name. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /** Original texture path; no selection or decoding. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.path
    resFilePath = "";

}
