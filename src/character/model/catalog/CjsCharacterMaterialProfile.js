import { exposure as be } from "#be";
import { meta, type } from "#schema";
import { vec4 } from "#math/vec4";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/**
 * Authored character color, pattern, and specular profile.
 *
 * The collection is optional and may be empty even when the decoded source
 * values exist in `characterDefinitions`. Schema-12 source material bindings
 * qualify the selection; an absent join remains unresolved. Pattern identity
 * stays verbatim beside the producer-qualified texture path and provenance.
 */
@meta.define("CjsCharacterMaterialProfile")
export class CjsCharacterMaterialProfile extends CjsCharacterRecord
{

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.path
    sourcePath = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.list("CjsCharacterColorValue")
    colors = [];

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    pattern = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.list("CjsCharacterColorValue")
    patternColors = [];

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.vec4
    patternTransform = vec4.fromValues(0, 0, 1, 1);

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    patternRotation = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.list("CjsCharacterColorValue")
    specularColors = [];

    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.path
    patternTexturePath = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.object.ref("CjsCharacterOrigin")
    patternOrigin = null;

}

export default CjsCharacterMaterialProfile;
