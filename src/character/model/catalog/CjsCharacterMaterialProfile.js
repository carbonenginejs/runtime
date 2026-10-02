import { meta } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/**
 * Authored character color, pattern, and specular profile.
 *
 * The collection is optional and may be empty even when the decoded source
 * values exist in `characterDefinitions`. The appearance resolver does not
 * read it; a consumer that needs a profile-to-part join must diagnose a
 * missing one rather than assume the catalog is populated.
 */
@meta.define({ className: "CjsCharacterMaterialProfile", family: "character" })
export class CjsCharacterMaterialProfile extends CjsCharacterRecord
{

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.path
    sourcePath = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.list("CjsCharacterColorValue")
    colors = [];

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    pattern = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.list("CjsCharacterColorValue")
    patternColors = [];

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.vec4
    patternTransform = [ 0, 0, 1, 1 ];

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    patternRotation = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.list("CjsCharacterColorValue")
    specularColors = [];

}

export default CjsCharacterMaterialProfile;
