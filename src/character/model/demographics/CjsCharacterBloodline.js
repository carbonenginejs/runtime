import { exposure as be } from "#be";
import { meta, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Character-creation bloodline record linked to its owning race. */
@meta.define("CjsCharacterBloodline")
export class CjsCharacterBloodline extends CjsCharacterRecord
{

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.int32
    charisma = 0;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    corporationID = null;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    descriptionID = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    iconID = null;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.int32
    intelligence = 0;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.int32
    memory = 0;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    nameID = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.int32
    perception = 0;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST, "raceID")
    @type.object.ref("CjsCharacterRace")
    race = null;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.int32
    willpower = 0;

}

export default CjsCharacterBloodline;
