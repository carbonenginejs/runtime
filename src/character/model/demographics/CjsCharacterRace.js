import { edit, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Character-creation race record with authored localization and starting-skill identities. */
@type.define({ className: "CjsCharacterRace", family: "character" })
export class CjsCharacterRace extends CjsCharacterRecord
{

    @edit.readwrite
    @edit.persist
    @type.map("int32")
    skills = null;

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
    @type.string
    nameID = "";

    @edit.readwrite
    @edit.persist
    @type.string
    shipTypeID = null;

}

export default CjsCharacterRace;
