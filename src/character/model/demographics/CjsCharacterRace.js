import { meta, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Character-creation race record with authored localization and starting-skill identities. */
@meta.define("CjsCharacterRace")
export class CjsCharacterRace extends CjsCharacterRecord
{

    @meta.readwrite
    @meta.persist
    @type.map("int32")
    skills = null;

    @meta.readwrite
    @meta.persist
    @type.string
    descriptionID = null;

    @meta.readwrite
    @meta.persist
    @type.string
    iconID = null;

    @meta.readwrite
    @meta.persist
    @type.string
    nameID = "";

    @meta.readwrite
    @meta.persist
    @type.string
    shipTypeID = null;

}

export default CjsCharacterRace;
