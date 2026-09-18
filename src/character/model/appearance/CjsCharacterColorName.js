import { edit, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Authored appearance-color name and hair-color classification. */
@type.define({ className: "CjsCharacterColorName", family: "character" })
export class CjsCharacterColorName extends CjsCharacterRecord
{

    @edit.readwrite
    @type.string
    colorName = "";

    @edit.readwrite
    @type.uint8
    hairColor = 0;

}

export default CjsCharacterColorName;
