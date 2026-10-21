import { exposure as be } from "#be";
import { meta, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/**
 * One authored character recipe folded into the combined catalog.
 *
 * The collection is optional and may be empty even when the decoded source
 * values exist in `characterDefinitions`. The appearance resolver does not
 * read it; a consumer that needs a profile-to-part join must diagnose a
 * missing one rather than assume the catalog is populated.
 */
@meta.define("CjsCharacterRecipeProfile")
export class CjsCharacterRecipeProfile extends CjsCharacterRecord
{

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.path
    sourcePath = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    sex = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.list("CjsCharacterRecipeEntry")
    entries = [];

}

export default CjsCharacterRecipeProfile;
