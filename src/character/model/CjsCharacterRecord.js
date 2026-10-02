import { meta } from "#schema";

/** Base for one record whose identity is the key from its source document. */
@meta.define({ className: "CjsCharacterRecord", family: "character" })
export class CjsCharacterRecord
{

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    recordID = "";

}

export default CjsCharacterRecord;
