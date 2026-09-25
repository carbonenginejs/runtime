import { edit, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/**
 * One authored character recipe folded into the combined catalog.
 *
 * The collection is optional and may be empty even when the decoded source
 * values exist in `characterDefinitions`. The appearance resolver does not
 * read it; a consumer that needs a profile-to-part join must diagnose a
 * missing one rather than assume the catalog is populated.
 */
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
