import { meta, type, blue } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Authored sculpt-control location naming its weight category and prefix. */
@meta.define("CjsCharacterSculptingLocation")
export class CjsCharacterSculptingLocation extends CjsCharacterRecord
{

    @blue.readwrite
    @blue.persist
    @type.string
    weightKeyCategory = "";

    @blue.readwrite
    @blue.persist
    @type.string
    weightKeyPrefix = "";

}

export default CjsCharacterSculptingLocation;
