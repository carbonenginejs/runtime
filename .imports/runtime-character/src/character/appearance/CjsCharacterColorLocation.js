import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Authored color-control location and its supported scalar controls. */
@type.define({ className: "CjsCharacterColorLocation", family: "character" })
export class CjsCharacterColorLocation extends CjsCharacterRecord
{

    @io.readwrite
    @type.string
    colorKey = "";

    @io.readwrite
    @type.uint8
    hasGloss = 0;

    @io.readwrite
    @type.uint8
    hasWeight = 0;

}

export default CjsCharacterColorLocation;
