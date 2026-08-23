import { io, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Character-creation bloodline record linked to its owning race. */
@type.define({ className: "CjsCharacterBloodline", family: "character" })
export class CjsCharacterBloodline extends CjsCharacterRecord
{

    @io.readwrite
    @type.int32
    charisma = 0;

    @io.readwrite
    @type.string
    corporationID = null;

    @io.readwrite
    @type.string
    descriptionID = "";

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
    nameID = "";

    @io.readwrite
    @type.int32
    perception = 0;

    @io.readwrite
    @type.model("CjsCharacterRace")
    raceID = null;

    @io.readwrite
    @type.int32
    willpower = 0;

}

export default CjsCharacterBloodline;
