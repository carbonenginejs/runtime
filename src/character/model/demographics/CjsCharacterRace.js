import { meta } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Character-creation race record with authored localization and starting-skill identities. */
@meta.define({ className: "CjsCharacterRace", family: "character" })
export class CjsCharacterRace extends CjsCharacterRecord
{

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.map("int32")
    skills = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    descriptionID = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    iconID = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    nameID = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    shipTypeID = null;

}

export default CjsCharacterRace;
