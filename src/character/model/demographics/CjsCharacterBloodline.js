import { meta, type, blue } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Character-creation bloodline record linked to its owning race. */
@meta.define("CjsCharacterBloodline")
export class CjsCharacterBloodline extends CjsCharacterRecord
{

    @blue.readwrite
    @blue.persist
    @type.int32
    charisma = 0;

    @blue.readwrite
    @blue.persist
    @type.string
    corporationID = null;

    @blue.readwrite
    @blue.persist
    @type.string
    descriptionID = "";

    @blue.readwrite
    @blue.persist
    @type.string
    iconID = null;

    @blue.readwrite
    @blue.persist
    @type.int32
    intelligence = 0;

    @blue.readwrite
    @blue.persist
    @type.int32
    memory = 0;

    @blue.readwrite
    @blue.persist
    @type.string
    nameID = "";

    @blue.readwrite
    @blue.persist
    @type.int32
    perception = 0;

    @blue.readwrite
    @blue.persist
    @type.rootRef("CjsCharacterRace")
    raceID = null;

    @blue.readwrite
    @blue.persist
    @type.int32
    willpower = 0;

}

export default CjsCharacterBloodline;
