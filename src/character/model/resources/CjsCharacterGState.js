import { meta, type } from "#schema";

/** Character library value record; no resource decoding or character construction. */
@meta.define("CjsCharacterGState")
export class CjsCharacterGState
{

    /** Lookup name. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /** Opaque animation state path. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.path(".gsf")
    resFilePath = "";

}
