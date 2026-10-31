import { exposure as be } from "#be";
import { meta, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Character-creation race record with authored localization and starting-skill identities. */
@meta.define("CjsCharacterRace")
export class CjsCharacterRace extends CjsCharacterRecord
{

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.map("int32")
    skills = null;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    descriptionID = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    iconID = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    nameID = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    shipTypeID = "";

}

export default CjsCharacterRace;
