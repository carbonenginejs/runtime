import { io, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Authored character projection profile with external texture references. */
@type.define({ className: "CjsCharacterProjectionProfile", family: "character" })
export class CjsCharacterProjectionProfile extends CjsCharacterRecord
{

    @io.readwrite
    @type.path
    sourcePath = "";

    @io.readwrite
    @type.string
    label = null;

    @io.readwrite
    @type.int32
    mode = 0;

    @io.readwrite
    @type.float64
    angleRotation = 0;

    @io.readwrite
    @type.float64
    aspectRatio = 1;

    @io.readwrite
    @type.float64
    azimuth = 0;

    @io.readwrite
    @type.path
    texturePath = null;

    @io.readwrite
    @type.path
    maskPath = null;

    @io.readwrite
    @type.boolean
    headEnabled = false;

    @io.readwrite
    @type.boolean
    bodyEnabled = false;

    @io.readwrite
    @type.boolean
    flipX = false;

    @io.readwrite
    @type.boolean
    flipY = false;

    @io.readwrite
    @type.float64
    height = 0;

    @io.readwrite
    @type.float64
    incline = 0;

    @io.readwrite
    @type.int32
    layer = 0;

    @io.readwrite
    @type.boolean
    maskPathEnabled = false;

    @io.readwrite
    @type.vec2
    offset = [ 0, 0 ];

    @io.readwrite
    @type.float64
    pitch = 0;

    @io.readwrite
    @type.float64
    planarBeta = 0;

    @io.readwrite
    @type.float64
    planarScale = 0;

    @io.readwrite
    @type.vec3
    position = [ 0, 0, 0 ];

    @io.readwrite
    @type.float64
    radius = 0;

    @io.readwrite
    @type.float64
    roll = 0;

    @io.readwrite
    @type.float64
    scale = 0;

    @io.readwrite
    @type.float64
    yaw = 0;

}

export default CjsCharacterProjectionProfile;
