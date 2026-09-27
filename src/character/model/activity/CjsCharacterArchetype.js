import { edit, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Transparent activity-archetype record retained by the character source document. */
@type.define({ className: "CjsCharacterArchetype", family: "character" })
export class CjsCharacterArchetype extends CjsCharacterRecord
{

    @edit.readwrite
    @edit.persist
    @type.list("string")
    contentTags = null;

    @edit.readwrite
    @edit.persist
    @type.string
    location = null;

    @edit.readwrite
    @edit.persist
    @type.string
    descriptionID = null;

    @edit.readwrite
    @edit.persist
    @type.string
    titleID = null;

}

export default CjsCharacterArchetype;
