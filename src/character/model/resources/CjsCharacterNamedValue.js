import { meta, type } from "#schema";

/** Character library value record; no resource decoding or character construction. */
@meta.define("CjsCharacterNamedValue")
export class CjsCharacterNamedValue
{

    /** Lookup name. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /** Named primitive value or opaque resource path. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.unknown
    value = null;

}
