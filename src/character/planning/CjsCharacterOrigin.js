import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

/** Provenance record classifying one appearance-plan fact or decision. */
@type.define({ className: "CjsCharacterOrigin", family: "character" })
export class CjsCharacterOrigin extends CjsModel
{

    @io.readwrite
    @type.string
    kind = "";

    @io.readwrite
    @type.string
    document = null;

    @io.readwrite
    @type.string
    recordID = null;

    @io.readwrite
    @type.string
    jsonPointer = null;

    @io.readwrite
    @type.path
    resourcePath = null;

    @io.readwrite
    @type.string
    rule = null;

}

export default CjsCharacterOrigin;
