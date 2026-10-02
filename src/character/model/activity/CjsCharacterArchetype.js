import { meta } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Transparent activity-archetype record retained by the character source document. */
@meta.define({ className: "CjsCharacterArchetype", family: "character" })
export class CjsCharacterArchetype extends CjsCharacterRecord
{

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.list("string")
    contentTags = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    location = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    descriptionID = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    titleID = null;

}

export default CjsCharacterArchetype;
