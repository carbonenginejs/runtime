import { io, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** One authored character recipe folded into the combined catalog. */
@type.define({ className: "CjsCharacterRecipeProfile", family: "character" })
export class CjsCharacterRecipeProfile extends CjsCharacterRecord
{

    @io.readwrite
    @type.path
    sourcePath = "";

    @io.readwrite
    @type.string
    sex = "";

    @io.readwrite
    @type.list("CjsCharacterRecipeEntry")
    entries = [];

}

export default CjsCharacterRecipeProfile;
