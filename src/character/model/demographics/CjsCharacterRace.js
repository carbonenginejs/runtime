import { meta, type, blue } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Character-creation race record with authored localization and starting-skill identities. */
@meta.define("CjsCharacterRace")
export class CjsCharacterRace extends CjsCharacterRecord
{

    @blue.readwrite
    @blue.persist
    @type.map("int32")
    skills = null;

    @blue.readwrite
    @blue.persist
    @type.string
    descriptionID = null;

    @blue.readwrite
    @blue.persist
    @type.string
    iconID = null;

    @blue.readwrite
    @blue.persist
    @type.string
    nameID = "";

    @blue.readwrite
    @blue.persist
    @type.string
    shipTypeID = null;

}

export default CjsCharacterRace;
