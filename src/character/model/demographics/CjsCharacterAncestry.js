import { meta } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Character-creation ancestry record linked to its owning bloodline. */
@meta.define({ className: "CjsCharacterAncestry", family: "character" })
export class CjsCharacterAncestry extends CjsCharacterRecord
{

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    shortDescription = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.model("CjsCharacterBloodline")
    bloodlineID = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.int32
    charisma = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    descriptionID = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    iconID = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.int32
    intelligence = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.int32
    memory = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    nameID = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.int32
    perception = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.int32
    willpower = 0;

}

export default CjsCharacterAncestry;
