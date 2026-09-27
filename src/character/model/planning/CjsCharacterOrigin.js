import { edit, type } from "#schema";
import { CjsModel } from "#model";

/** Provenance record classifying one appearance-plan fact or decision. */
@type.define({ className: "CjsCharacterOrigin", family: "character" })
export class CjsCharacterOrigin extends CjsModel
{

    @edit.readwrite
    @edit.persist
    @type.string
    kind = "";

    @edit.readwrite
    @edit.persist
    @type.string
    document = null;

    @edit.readwrite
    @edit.persist
    @type.string
    recordID = null;

    @edit.readwrite
    @edit.persist
    @type.string
    jsonPointer = null;

    @edit.readwrite
    @edit.persist
    @type.path
    resourcePath = null;

    @edit.readwrite
    @edit.persist
    @type.string
    rule = null;

}

export default CjsCharacterOrigin;
