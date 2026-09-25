import { edit, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/**
 * Authored character projection profile with external texture references.
 *
 * The collection is optional and may be empty even when the decoded source
 * values exist in `characterDefinitions`. The appearance resolver does not
 * read it; a consumer that needs a profile-to-part join must diagnose a
 * missing one rather than assume the catalog is populated.
 */
@type.define({ className: "CjsCharacterProjectionProfile", family: "character" })
export class CjsCharacterProjectionProfile extends CjsCharacterRecord
{

    @edit.readwrite
    @type.path
    sourcePath = "";

    @edit.readwrite
    @type.string
    label = null;

    @edit.readwrite
    @type.int32
    mode = 0;

    @edit.readwrite
    @type.float64
    angleRotation = 0;

    @edit.readwrite
    @type.float64
    aspectRatio = 1;

    @edit.readwrite
    @type.float64
    azimuth = 0;

    @edit.readwrite
    @type.path
    texturePath = null;

    @edit.readwrite
    @type.path
    maskPath = null;

    @edit.readwrite
    @type.boolean
    headEnabled = false;

    @edit.readwrite
    @type.boolean
    bodyEnabled = false;

    @edit.readwrite
    @type.boolean
    flipX = false;

    @edit.readwrite
    @type.boolean
    flipY = false;

    @edit.readwrite
    @type.float64
    height = 0;

    @edit.readwrite
    @type.float64
    incline = 0;

    @edit.readwrite
    @type.int32
    layer = 0;

    @edit.readwrite
    @type.boolean
    maskPathEnabled = false;

    @edit.readwrite
    @type.vec2
    offset = [ 0, 0 ];

    @edit.readwrite
    @type.float64
    pitch = 0;

    @edit.readwrite
    @type.float64
    planarBeta = 0;

    @edit.readwrite
    @type.float64
    planarScale = 0;

    @edit.readwrite
    @type.vec3
    position = [ 0, 0, 0 ];

    @edit.readwrite
    @type.float64
    radius = 0;

    @edit.readwrite
    @type.float64
    roll = 0;

    @edit.readwrite
    @type.float64
    scale = 0;

    @edit.readwrite
    @type.float64
    yaw = 0;

}

export default CjsCharacterProjectionProfile;
