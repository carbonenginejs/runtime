import { exposure as be } from "#be";
import { meta, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Authored sculpt-control location naming its weight category and prefix. */
@meta.define("CjsCharacterSculptingLocation")
export class CjsCharacterSculptingLocation extends CjsCharacterRecord
{

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    weightKeyCategory = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    weightKeyPrefix = "";

}

export default CjsCharacterSculptingLocation;
