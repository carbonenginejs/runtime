import { meta } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/**
 * One authored character recipe folded into the combined catalog.
 *
 * The collection is optional and may be empty even when the decoded source
 * values exist in `characterDefinitions`. The appearance resolver does not
 * read it; a consumer that needs a profile-to-part join must diagnose a
 * missing one rather than assume the catalog is populated.
 */
@meta.define({ className: "CjsCharacterRecipeProfile", family: "character" })
export class CjsCharacterRecipeProfile extends CjsCharacterRecord
{

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.path
    sourcePath = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    sex = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.list("CjsCharacterRecipeEntry")
    entries = [];

}

export default CjsCharacterRecipeProfile;
