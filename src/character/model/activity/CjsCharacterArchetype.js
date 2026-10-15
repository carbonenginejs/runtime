import { meta, type, blue } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Transparent activity-archetype record retained by the character source document. */
@meta.define("CjsCharacterArchetype")
export class CjsCharacterArchetype extends CjsCharacterRecord
{

    @blue.readwrite
    @blue.persist
    @type.list("string")
    contentTags = null;

    @blue.readwrite
    @blue.persist
    @type.string
    location = null;

    @blue.readwrite
    @blue.persist
    @type.string
    descriptionID = null;

    @blue.readwrite
    @blue.persist
    @type.string
    titleID = null;

}

export default CjsCharacterArchetype;
