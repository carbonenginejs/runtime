import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** One published character type definition folded into the combined catalog. */
@type.define({ className: "CjsCharacterPartType", family: "character" })
export class CjsCharacterPartType extends CjsCharacterRecord
{

    @io.readwrite
    @type.path
    sourcePath = "";

    @io.readwrite
    @type.string
    sex = "";

    @io.readwrite
    @type.string
    partPath = "";

    @io.readwrite
    @type.string
    resourceVersion = null;

    @io.readwrite
    @type.string
    colorVariant = null;

    @io.readwrite
    @type.model("CjsCharacterPartSource")
    partSource = null;

}

export default CjsCharacterPartType;
