import { meta, type, blue } from "#schema";

/** Base for one record whose identity is the key from its source document. */
@meta.define("CjsCharacterRecord")
export class CjsCharacterRecord
{

    @blue.readwrite
    @blue.persist
    @type.string
    recordID = "";

}

export default CjsCharacterRecord;
