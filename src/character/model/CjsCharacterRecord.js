import { io, type } from "#schema";
import { CjsModel } from "#model";

/** Base for one record whose identity is the key from its source document. */
@type.define({ className: "CjsCharacterRecord", family: "character" })
export class CjsCharacterRecord extends CjsModel
{

    @io.readwrite
    @type.string
    recordID = "";

}

export default CjsCharacterRecord;
