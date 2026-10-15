import { meta, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Authored color-control location and its supported scalar controls. */
@meta.define("CjsCharacterColorLocation")
export class CjsCharacterColorLocation extends CjsCharacterRecord
{

    @meta.readwrite
    @meta.persist
    @type.string
    colorKey = "";

    @meta.readwrite
    @meta.persist
    @type.uint8
    hasGloss = 0;

    @meta.readwrite
    @meta.persist
    @type.uint8
    hasWeight = 0;

}

export default CjsCharacterColorLocation;
