import { exposure as be } from "#be";
import { meta, type } from "#schema";
import { vec2 } from "#math/vec2";
import { vec3 } from "#math/vec3";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/**
 * Authored character projection profile with external texture references.
 *
 * The collection is optional and may be empty even when the decoded source
 * values exist in `characterDefinitions`. The appearance resolver does not
 * read it; a consumer that needs a profile-to-part join must diagnose a
 * missing one rather than assume the catalog is populated.
 */
@meta.define("CjsCharacterProjectionProfile")
export class CjsCharacterProjectionProfile extends CjsCharacterRecord
{

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.path
    sourcePath = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    label = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.int32
    mode = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    angleRotation = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    aspectRatio = 1;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    azimuth = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.path
    texturePath = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.path
    maskPath = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.boolean
    headEnabled = false;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.boolean
    bodyEnabled = false;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.boolean
    flipX = false;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.boolean
    flipY = false;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    height = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    incline = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.int32
    layer = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.boolean
    maskPathEnabled = false;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.vec2
    offset = vec2.create();

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    pitch = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    planarBeta = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    planarScale = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.vec3
    position = vec3.create();

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    radius = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    roll = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    scale = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    yaw = 0;

}

export default CjsCharacterProjectionProfile;
