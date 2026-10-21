import { exposure as be } from "#be";
import { meta, type } from "#schema";

/** Base for one record whose identity is the key from its source document. */
@meta.define("CjsCharacterRecord")
export class CjsCharacterRecord
{

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    recordID = "";

}

export default CjsCharacterRecord;
