import { meta, type, blue } from "#schema";
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

    @blue.readwrite
    @blue.persist
    @type.path
    sourcePath = "";

    @blue.readwrite
    @blue.persist
    @type.list("CjsCharacterColorValue")
    colors = [];

    @blue.readwrite
    @blue.persist
    @type.string
    pattern = null;

    @blue.readwrite
    @blue.persist
    @type.list("CjsCharacterColorValue")
    patternColors = [];

    @blue.readwrite
    @blue.persist
    @type.vec4
    patternTransform = vec4.fromValues(0, 0, 1, 1);

    @blue.readwrite
    @blue.persist
    @type.float64
    patternRotation = 0;

    @blue.readwrite
    @blue.persist
    @type.list("CjsCharacterColorValue")
    specularColors = [];

}

export default CjsCharacterMaterialProfile;
