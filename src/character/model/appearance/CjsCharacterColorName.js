import { meta, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Authored appearance-color name and hair-color classification. */
@meta.define("CjsCharacterColorName")
export class CjsCharacterColorName extends CjsCharacterRecord
{

    @meta.readwrite
    @meta.persist
    @type.string
    colorName = "";

    @meta.readwrite
    @meta.persist
    @type.uint8
    hairColor = 0;

}

export default CjsCharacterColorName;
