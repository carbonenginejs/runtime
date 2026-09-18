import { edit, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Character-creation race record with authored localization and starting-skill identities. */
@type.define({ className: "CjsCharacterRace", family: "character" })
export class CjsCharacterRace extends CjsCharacterRecord
{

    @edit.readwrite
    @type.map("int32")
    skills = null;

    @edit.readwrite
    @type.string
    descriptionID = null;

    @edit.readwrite
    @type.string
    iconID = null;

    @edit.readwrite
    @type.string
    nameID = "";

    @edit.readwrite
    @type.string
    shipTypeID = null;

}

export default CjsCharacterRace;
