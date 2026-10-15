import { meta, type } from "#schema";
import { vec4 } from "#math/vec4";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/**
 * Authored character color, pattern, and specular profile.
 *
 * The collection is optional and may be empty even when the decoded source
 * values exist in `characterDefinitions`. The appearance resolver does not
 * read it; a consumer that needs a profile-to-part join must diagnose a
 * missing one rather than assume the catalog is populated.
 */
@meta.define("CjsCharacterMaterialProfile")
export class CjsCharacterMaterialProfile extends CjsCharacterRecord
{

    @meta.readwrite
    @meta.persist
    @type.path
    sourcePath = "";

    @meta.readwrite
    @meta.persist
    @type.list("CjsCharacterColorValue")
    colors = [];

    @meta.readwrite
    @meta.persist
    @type.string
    pattern = null;

    @meta.readwrite
    @meta.persist
    @type.list("CjsCharacterColorValue")
    patternColors = [];

    @meta.readwrite
    @meta.persist
    @type.vec4
    patternTransform = vec4.fromValues(0, 0, 1, 1);

    @meta.readwrite
    @meta.persist
    @type.float64
    patternRotation = 0;

    @meta.readwrite
    @meta.persist
    @type.list("CjsCharacterColorValue")
    specularColors = [];

}

export default CjsCharacterMaterialProfile;
