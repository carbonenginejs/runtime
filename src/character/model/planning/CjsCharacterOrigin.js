import { edit, type } from "#schema";
import { CjsModel } from "#model";

/** Provenance record classifying one appearance-plan fact or decision. */
@type.define({ className: "CjsCharacterOrigin", family: "character" })
export class CjsCharacterOrigin extends CjsModel
{

    @edit.readwrite
    @type.string
    kind = "";

    @edit.readwrite
    @type.string
    document = null;

    @edit.readwrite
    @type.string
    recordID = null;

    @edit.readwrite
    @type.string
    jsonPointer = null;

    @edit.readwrite
    @type.path
    resourcePath = null;

    @edit.readwrite
    @type.string
    rule = null;

}

export default CjsCharacterOrigin;
