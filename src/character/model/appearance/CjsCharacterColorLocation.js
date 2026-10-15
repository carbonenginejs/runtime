import { meta, type, blue } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Authored color-control location and its supported scalar controls. */
@meta.define("CjsCharacterColorLocation")
export class CjsCharacterColorLocation extends CjsCharacterRecord
{

    @blue.readwrite
    @blue.persist
    @type.string
    colorKey = "";

    @blue.readwrite
    @blue.persist
    @type.uint8
    hasGloss = 0;

    @blue.readwrite
    @blue.persist
    @type.uint8
    hasWeight = 0;

}

export default CjsCharacterColorLocation;
