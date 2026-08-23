import { io, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Character-creation ancestry record linked to its owning bloodline. */
@type.define({ className: "CjsCharacterAncestry", family: "character" })
export class CjsCharacterAncestry extends CjsCharacterRecord
{

    @io.readwrite
    @type.string
    shortDescription = null;

    @io.readwrite
    @type.model("CjsCharacterBloodline")
    bloodlineID = null;

    @io.readwrite
    @type.int32
    charisma = 0;

    @io.readwrite
    @type.string
    descriptionID = null;

    @io.readwrite
    @type.string
    iconID = null;

    @io.readwrite
    @type.int32
    intelligence = 0;

    @io.readwrite
    @type.int32
    memory = 0;

    @io.readwrite
    @type.string
    nameID = null;

    @io.readwrite
    @type.int32
    perception = 0;

    @io.readwrite
    @type.int32
    willpower = 0;

}

export default CjsCharacterAncestry;
