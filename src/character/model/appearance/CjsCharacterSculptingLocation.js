import { edit, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Authored sculpt-control location naming its weight category and prefix. */
@type.define({ className: "CjsCharacterSculptingLocation", family: "character" })
export class CjsCharacterSculptingLocation extends CjsCharacterRecord
{

    @edit.readwrite
    @type.string
    weightKeyCategory = "";

    @edit.readwrite
    @type.string
    weightKeyPrefix = "";

}

export default CjsCharacterSculptingLocation;
