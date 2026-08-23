import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

/** Base for one record whose identity is the key from its source document. */
@type.define({ className: "CjsCharacterRecord", family: "character" })
export class CjsCharacterRecord extends CjsModel
{

    @io.readwrite
    @type.string
    recordID = "";

}

export default CjsCharacterRecord;
