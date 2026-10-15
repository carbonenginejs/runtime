import { meta, type, blue } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Authored appearance-color name and hair-color classification. */
@meta.define("CjsCharacterColorName")
export class CjsCharacterColorName extends CjsCharacterRecord
{

    @blue.readwrite
    @blue.persist
    @type.string
    colorName = "";

    @blue.readwrite
    @blue.persist
    @type.uint8
    hairColor = 0;

}

export default CjsCharacterColorName;
