import { exposure as be } from "#be";
import { meta, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Authored color-control location and its supported scalar controls. */
@meta.define("CjsCharacterColorLocation")
export class CjsCharacterColorLocation extends CjsCharacterRecord
{

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    colorKey = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.uint8
    hasGloss = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.uint8
    hasWeight = 0;

}

export default CjsCharacterColorLocation;
