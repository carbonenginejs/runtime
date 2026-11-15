import { meta, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Character library value record; no resource decoding or character construction. */
@meta.define("CjsCharacterNamedValue")
@meta.exposureChainTo(CjsCharacterRecord)
export class CjsCharacterNamedValue extends CjsCharacterRecord
{

    /** Lookup name. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /** The file's own resource path (its `name`); the path-only kinds hold nothing else. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.path
    value = "";

}
