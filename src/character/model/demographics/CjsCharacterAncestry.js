import { edit, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Character-creation ancestry record linked to its owning bloodline. */
@type.define({ className: "CjsCharacterAncestry", family: "character" })
export class CjsCharacterAncestry extends CjsCharacterRecord
{

    @edit.readwrite
    @edit.persist
    @type.string
    shortDescription = null;

    @edit.readwrite
    @edit.persist
    @type.model("CjsCharacterBloodline")
    bloodlineID = null;

    @edit.readwrite
    @edit.persist
    @type.int32
    charisma = 0;

    @edit.readwrite
    @edit.persist
    @type.string
    descriptionID = null;

    @edit.readwrite
    @edit.persist
    @type.string
    iconID = null;

    @edit.readwrite
    @edit.persist
    @type.int32
    intelligence = 0;

    @edit.readwrite
    @edit.persist
    @type.int32
    memory = 0;

    @edit.readwrite
    @edit.persist
    @type.string
    nameID = null;

    @edit.readwrite
    @edit.persist
    @type.int32
    perception = 0;

    @edit.readwrite
    @edit.persist
    @type.int32
    willpower = 0;

}

export default CjsCharacterAncestry;
