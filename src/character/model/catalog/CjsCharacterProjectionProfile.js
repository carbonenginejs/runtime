import { meta, type, blue } from "#schema";
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

    @blue.readwrite
    @blue.persist
    @type.path
    sourcePath = "";

    @blue.readwrite
    @blue.persist
    @type.string
    label = null;

    @blue.readwrite
    @blue.persist
    @type.int32
    mode = 0;

    @blue.readwrite
    @blue.persist
    @type.float64
    angleRotation = 0;

    @blue.readwrite
    @blue.persist
    @type.float64
    aspectRatio = 1;

    @blue.readwrite
    @blue.persist
    @type.float64
    azimuth = 0;

    @blue.readwrite
    @blue.persist
    @type.path
    texturePath = null;

    @blue.readwrite
    @blue.persist
    @type.path
    maskPath = null;

    @blue.readwrite
    @blue.persist
    @type.boolean
    headEnabled = false;

    @blue.readwrite
    @blue.persist
    @type.boolean
    bodyEnabled = false;

    @blue.readwrite
    @blue.persist
    @type.boolean
    flipX = false;

    @blue.readwrite
    @blue.persist
    @type.boolean
    flipY = false;

    @blue.readwrite
    @blue.persist
    @type.float64
    height = 0;

    @blue.readwrite
    @blue.persist
    @type.float64
    incline = 0;

    @blue.readwrite
    @blue.persist
    @type.int32
    layer = 0;

    @blue.readwrite
    @blue.persist
    @type.boolean
    maskPathEnabled = false;

    @blue.readwrite
    @blue.persist
    @type.vec2
    offset = vec2.create();

    @blue.readwrite
    @blue.persist
    @type.float64
    pitch = 0;

    @blue.readwrite
    @blue.persist
    @type.float64
    planarBeta = 0;

    @blue.readwrite
    @blue.persist
    @type.float64
    planarScale = 0;

    @blue.readwrite
    @blue.persist
    @type.vec3
    position = vec3.create();

    @blue.readwrite
    @blue.persist
    @type.float64
    radius = 0;

    @blue.readwrite
    @blue.persist
    @type.float64
    roll = 0;

    @blue.readwrite
    @blue.persist
    @type.float64
    scale = 0;

    @blue.readwrite
    @blue.persist
    @type.float64
    yaw = 0;

}

export default CjsCharacterProjectionProfile;
