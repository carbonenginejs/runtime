import { io, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Transparent activity-archetype record retained by the character source document. */
@type.define({ className: "CjsCharacterArchetype", family: "character" })
export class CjsCharacterArchetype extends CjsCharacterRecord
{

    @io.readwrite
    @type.list("string")
    contentTags = null;

    @io.readwrite
    @type.string
    location = null;

    @io.readwrite
    @type.string
    descriptionID = null;

    @io.readwrite
    @type.string
    titleID = null;

}

export default CjsCharacterArchetype;
