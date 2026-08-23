import { io, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Authored sculpt-control location naming its weight category and prefix. */
@type.define({ className: "CjsCharacterSculptingLocation", family: "character" })
export class CjsCharacterSculptingLocation extends CjsCharacterRecord
{

    @io.readwrite
    @type.string
    weightKeyCategory = "";

    @io.readwrite
    @type.string
    weightKeyPrefix = "";

}

export default CjsCharacterSculptingLocation;
