import { meta, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Authored sculpt-control location naming its weight category and prefix. */
@meta.define("CjsCharacterSculptingLocation")
export class CjsCharacterSculptingLocation extends CjsCharacterRecord
{

    @meta.readwrite
    @meta.persist
    @type.string
    weightKeyCategory = "";

    @meta.readwrite
    @meta.persist
    @type.string
    weightKeyPrefix = "";

}

export default CjsCharacterSculptingLocation;
