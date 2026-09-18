import { edit, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** One published character type definition folded into the combined catalog. */
@type.define({ className: "CjsCharacterPartType", family: "character" })
export class CjsCharacterPartType extends CjsCharacterRecord
{

    @edit.readwrite
    @type.path
    sourcePath = "";

    @edit.readwrite
    @type.list("string")
    sourcePaths = [];

    @edit.readwrite
    @type.string
    sex = "";

    @edit.readwrite
    @type.string
    partPath = "";

    @edit.readwrite
    @type.string
    resourceVersion = null;

    @edit.readwrite
    @type.string
    colorVariant = null;

    @edit.readwrite
    @type.list("string")
    bloodlineIDs = [];

    @edit.readwrite
    @type.model("CjsCharacterPartSource")
    partSource = null;

    @edit.readwrite
    @type.list("CjsCharacterPartSource")
    partSources = [];

}

export default CjsCharacterPartType;
