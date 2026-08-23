import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Character-creation race record with authored localization and starting-skill identities. */
@type.define({ className: "CjsCharacterRace", family: "character" })
export class CjsCharacterRace extends CjsCharacterRecord
{

    @io.readwrite
    @type.map("int32")
    skills = null;

    @io.readwrite
    @type.string
    descriptionID = null;

    @io.readwrite
    @type.string
    iconID = null;

    @io.readwrite
    @type.string
    nameID = "";

    @io.readwrite
    @type.string
    shipTypeID = null;

}

export default CjsCharacterRace;
