import { edit, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Authored color-control location and its supported scalar controls. */
@type.define({ className: "CjsCharacterColorLocation", family: "character" })
export class CjsCharacterColorLocation extends CjsCharacterRecord
{

    @edit.readwrite
    @type.string
    colorKey = "";

    @edit.readwrite
    @type.uint8
    hasGloss = 0;

    @edit.readwrite
    @type.uint8
    hasWeight = 0;

}

export default CjsCharacterColorLocation;
