import { exposure as be } from "#be";
import { meta, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Transparent activity-archetype record retained by the character source document. */
@meta.define("CjsCharacterArchetype")
export class CjsCharacterArchetype extends CjsCharacterRecord
{

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("string")
    contentTags = null;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    location = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    descriptionID = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    titleID = "";

}

export default CjsCharacterArchetype;
