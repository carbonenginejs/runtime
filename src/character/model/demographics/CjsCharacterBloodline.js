import { edit, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Character-creation bloodline record linked to its owning race. */
@type.define({ className: "CjsCharacterBloodline", family: "character" })
export class CjsCharacterBloodline extends CjsCharacterRecord
{

    @edit.readwrite
    @type.int32
    charisma = 0;

    @edit.readwrite
    @type.string
    corporationID = null;

    @edit.readwrite
    @type.string
    descriptionID = "";

    @edit.readwrite
    @type.string
    iconID = null;

    @edit.readwrite
    @type.int32
    intelligence = 0;

    @edit.readwrite
    @type.int32
    memory = 0;

    @edit.readwrite
    @type.string
    nameID = "";

    @edit.readwrite
    @type.int32
    perception = 0;

    @edit.readwrite
    @type.model("CjsCharacterRace")
    raceID = null;

    @edit.readwrite
    @type.int32
    willpower = 0;

}

export default CjsCharacterBloodline;
