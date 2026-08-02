import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Authored appearance-color name and hair-color classification. */
@type.define({ className: "CjsCharacterColorName", family: "character" })
export class CjsCharacterColorName extends CjsCharacterRecord
{

    @io.readwrite
    @type.string
    colorName = "";

    @io.readwrite
    @type.uint8
    hairColor = 0;

}

export default CjsCharacterColorName;
