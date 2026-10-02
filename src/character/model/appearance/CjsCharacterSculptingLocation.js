import { meta } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Authored sculpt-control location naming its weight category and prefix. */
@meta.define({ className: "CjsCharacterSculptingLocation", family: "character" })
export class CjsCharacterSculptingLocation extends CjsCharacterRecord
{

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    weightKeyCategory = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    weightKeyPrefix = "";

}

export default CjsCharacterSculptingLocation;
