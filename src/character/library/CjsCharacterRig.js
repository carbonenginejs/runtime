import { meta, type } from "#schema";

/** Character library value record; no resource decoding or character construction. */
@meta.define("CjsCharacterRig")
export class CjsCharacterRig
{

    /** Lookup name. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /** Opaque rig path. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.path(".gr2")
    resFilePath = "";

}
