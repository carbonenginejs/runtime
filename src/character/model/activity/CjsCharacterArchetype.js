import { meta, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Transparent activity-archetype record retained by the character source document. */
@meta.define("CjsCharacterArchetype")
export class CjsCharacterArchetype extends CjsCharacterRecord
{

    @meta.readwrite
    @meta.persist
    @type.list("string")
    contentTags = null;

    @meta.readwrite
    @meta.persist
    @type.string
    location = null;

    @meta.readwrite
    @meta.persist
    @type.string
    descriptionID = null;

    @meta.readwrite
    @meta.persist
    @type.string
    titleID = null;

}

export default CjsCharacterArchetype;
