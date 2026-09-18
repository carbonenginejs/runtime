import { edit, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** One authored character recipe folded into the combined catalog. */
@type.define({ className: "CjsCharacterRecipeProfile", family: "character" })
export class CjsCharacterRecipeProfile extends CjsCharacterRecord
{

    @edit.readwrite
    @type.path
    sourcePath = "";

    @edit.readwrite
    @type.string
    sex = "";

    @edit.readwrite
    @type.list("CjsCharacterRecipeEntry")
    entries = [];

}

export default CjsCharacterRecipeProfile;
