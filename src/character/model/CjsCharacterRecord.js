import { edit, type } from "#schema";

/** Base for one record whose identity is the key from its source document. */
@type.define({ className: "CjsCharacterRecord", family: "character" })
export class CjsCharacterRecord
{

    @edit.readwrite
    @edit.persist
    @type.string
    recordID = "";

}

export default CjsCharacterRecord;
