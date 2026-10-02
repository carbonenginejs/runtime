import { meta } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/**
 * Authored character projection profile with external texture references.
 *
 * The collection is optional and may be empty even when the decoded source
 * values exist in `characterDefinitions`. The appearance resolver does not
 * read it; a consumer that needs a profile-to-part join must diagnose a
 * missing one rather than assume the catalog is populated.
 */
@meta.define({ className: "CjsCharacterProjectionProfile", family: "character" })
export class CjsCharacterProjectionProfile extends CjsCharacterRecord
{

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.path
    sourcePath = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    label = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.int32
    mode = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    angleRotation = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    aspectRatio = 1;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    azimuth = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.path
    texturePath = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.path
    maskPath = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.boolean
    headEnabled = false;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.boolean
    bodyEnabled = false;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.boolean
    flipX = false;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.boolean
    flipY = false;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    height = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    incline = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.int32
    layer = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.boolean
    maskPathEnabled = false;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.vec2
    offset = [ 0, 0 ];

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    pitch = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    planarBeta = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    planarScale = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.vec3
    position = [ 0, 0, 0 ];

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    radius = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    roll = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    scale = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    yaw = 0;

}

export default CjsCharacterProjectionProfile;
