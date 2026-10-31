import { meta, type } from "#schema";

/** Character library value record; no resource decoding or character construction. */
@meta.define("CjsCharacterModifier")
export class CjsCharacterModifier
{

    /** Parsed modifier path; raw text stays on the metadata. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    path = "";

    /** Explicit weight or the unsuffixed unit weight. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    weight = 1;

}
