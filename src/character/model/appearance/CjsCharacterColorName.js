import { exposure as be } from "#be";
import { meta, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Authored appearance-color name and hair-color classification. */
@meta.define("CjsCharacterColorName")
export class CjsCharacterColorName extends CjsCharacterRecord
{

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    colorName = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.uint8
    hairColor = 0;

}

export default CjsCharacterColorName;
