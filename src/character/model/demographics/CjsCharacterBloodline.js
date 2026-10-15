import { meta, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Character-creation bloodline record linked to its owning race. */
@meta.define("CjsCharacterBloodline")
export class CjsCharacterBloodline extends CjsCharacterRecord
{

    @meta.readwrite
    @meta.persist
    @type.int32
    charisma = 0;

    @meta.readwrite
    @meta.persist
    @type.string
    corporationID = null;

    @meta.readwrite
    @meta.persist
    @type.string
    descriptionID = "";

    @meta.readwrite
    @meta.persist
    @type.string
    iconID = null;

    @meta.readwrite
    @meta.persist
    @type.int32
    intelligence = 0;

    @meta.readwrite
    @meta.persist
    @type.int32
    memory = 0;

    @meta.readwrite
    @meta.persist
    @type.string
    nameID = "";

    @meta.readwrite
    @meta.persist
    @type.int32
    perception = 0;

    @meta.readwrite
    @meta.persist
    @type.rootRef("CjsCharacterRace")
    raceID = null;

    @meta.readwrite
    @meta.persist
    @type.int32
    willpower = 0;

}

export default CjsCharacterBloodline;
