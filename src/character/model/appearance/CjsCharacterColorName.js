import { meta } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Authored appearance-color name and hair-color classification. */
@meta.define({ className: "CjsCharacterColorName", family: "character" })
export class CjsCharacterColorName extends CjsCharacterRecord
{

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    colorName = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.uint8
    hairColor = 0;

}

export default CjsCharacterColorName;
