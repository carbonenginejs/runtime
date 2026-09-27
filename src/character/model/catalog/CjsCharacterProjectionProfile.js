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
    @edit.persist
    @type.path
    sourcePath = "";

    @edit.readwrite
    @edit.persist
    @type.string
    label = null;

    @edit.readwrite
    @edit.persist
    @type.int32
    mode = 0;

    @edit.readwrite
    @edit.persist
    @type.float64
    angleRotation = 0;

    @edit.readwrite
    @edit.persist
    @type.float64
    aspectRatio = 1;

    @edit.readwrite
    @edit.persist
    @type.float64
    azimuth = 0;

    @edit.readwrite
    @edit.persist
    @type.path
    texturePath = null;

    @edit.readwrite
    @edit.persist
    @type.path
    maskPath = null;

    @edit.readwrite
    @edit.persist
    @type.boolean
    headEnabled = false;

    @edit.readwrite
    @edit.persist
    @type.boolean
    bodyEnabled = false;

    @edit.readwrite
    @edit.persist
    @type.boolean
    flipX = false;

    @edit.readwrite
    @edit.persist
    @type.boolean
    flipY = false;

    @edit.readwrite
    @edit.persist
    @type.float64
    height = 0;

    @edit.readwrite
    @edit.persist
    @type.float64
    incline = 0;

    @edit.readwrite
    @edit.persist
    @type.int32
    layer = 0;

    @edit.readwrite
    @edit.persist
    @type.boolean
    maskPathEnabled = false;

    @edit.readwrite
    @edit.persist
    @type.vec2
    offset = [ 0, 0 ];

    @edit.readwrite
    @edit.persist
    @type.float64
    pitch = 0;

    @edit.readwrite
    @edit.persist
    @type.float64
    planarBeta = 0;

    @edit.readwrite
    @edit.persist
    @type.float64
    planarScale = 0;

    @edit.readwrite
    @edit.persist
    @type.vec3
    position = [ 0, 0, 0 ];

    @edit.readwrite
    @edit.persist
    @type.float64
    radius = 0;

    @edit.readwrite
    @edit.persist
    @type.float64
    roll = 0;

    @edit.readwrite
    @edit.persist
    @type.float64
    scale = 0;

    @edit.readwrite
    @edit.persist
    @type.float64
    yaw = 0;

}

export default CjsCharacterProjectionProfile;
