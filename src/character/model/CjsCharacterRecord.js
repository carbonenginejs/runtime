import { meta, type } from "#schema";

/** Base for one record whose identity is the key from its source document. */
@meta.define("CjsCharacterRecord")
export class CjsCharacterRecord
{

    @meta.readwrite
    @meta.persist
    @type.string
    recordID = "";

}

export default CjsCharacterRecord;
