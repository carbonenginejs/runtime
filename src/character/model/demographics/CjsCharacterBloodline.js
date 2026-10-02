import { meta } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Character-creation bloodline record linked to its owning race. */
@meta.define({ className: "CjsCharacterBloodline", family: "character" })
export class CjsCharacterBloodline extends CjsCharacterRecord
{

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.int32
    charisma = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    corporationID = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    descriptionID = "";

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
    nameID = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.int32
    perception = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.model("CjsCharacterRace")
    raceID = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.int32
    willpower = 0;

}

export default CjsCharacterBloodline;
