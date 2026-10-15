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

    @meta.readwrite
    @meta.persist
    @type.path
    sourcePath = "";

    @meta.readwrite
    @meta.persist
    @type.string
    label = null;

    @meta.readwrite
    @meta.persist
    @type.int32
    mode = 0;

    @meta.readwrite
    @meta.persist
    @type.float64
    angleRotation = 0;

    @meta.readwrite
    @meta.persist
    @type.float64
    aspectRatio = 1;

    @meta.readwrite
    @meta.persist
    @type.float64
    azimuth = 0;

    @meta.readwrite
    @meta.persist
    @type.path
    texturePath = null;

    @meta.readwrite
    @meta.persist
    @type.path
    maskPath = null;

    @meta.readwrite
    @meta.persist
    @type.boolean
    headEnabled = false;

    @meta.readwrite
    @meta.persist
    @type.boolean
    bodyEnabled = false;

    @meta.readwrite
    @meta.persist
    @type.boolean
    flipX = false;

    @meta.readwrite
    @meta.persist
    @type.boolean
    flipY = false;

    @meta.readwrite
    @meta.persist
    @type.float64
    height = 0;

    @meta.readwrite
    @meta.persist
    @type.float64
    incline = 0;

    @meta.readwrite
    @meta.persist
    @type.int32
    layer = 0;

    @meta.readwrite
    @meta.persist
    @type.boolean
    maskPathEnabled = false;

    @meta.readwrite
    @meta.persist
    @type.vec2
    offset = vec2.create();

    @meta.readwrite
    @meta.persist
    @type.float64
    pitch = 0;

    @meta.readwrite
    @meta.persist
    @type.float64
    planarBeta = 0;

    @meta.readwrite
    @meta.persist
    @type.float64
    planarScale = 0;

    @meta.readwrite
    @meta.persist
    @type.vec3
    position = vec3.create();

    @meta.readwrite
    @meta.persist
    @type.float64
    radius = 0;

    @meta.readwrite
    @meta.persist
    @type.float64
    roll = 0;

    @meta.readwrite
    @meta.persist
    @type.float64
    scale = 0;

    @meta.readwrite
    @meta.persist
    @type.float64
    yaw = 0;

}

export default CjsCharacterProjectionProfile;
