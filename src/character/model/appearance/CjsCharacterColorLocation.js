import { meta } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Authored color-control location and its supported scalar controls. */
@meta.define({ className: "CjsCharacterColorLocation", family: "character" })
export class CjsCharacterColorLocation extends CjsCharacterRecord
{

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    colorKey = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.uint8
    hasGloss = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.uint8
    hasWeight = 0;

}

export default CjsCharacterColorLocation;
