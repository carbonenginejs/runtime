import { meta, type } from "#schema";

/** Character library value record; no resource decoding or character construction. */
@meta.define("CjsCharacterClip")
export class CjsCharacterClip
{

    /** Lookup name. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /** Opaque animation clip path. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.path(".gr2")
    resFilePath = "";

}
