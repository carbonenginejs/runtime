import { io, type } from "@carbonenginejs/core-types/schema";
import { vec2 } from "@carbonenginejs/core-math/vec2";
import { vec3 } from "@carbonenginejs/core-math/vec3";
import { CjsCharacterNode } from "../CjsCharacterNode.js";

@type.define({ className: "CjsCharacterProjection", family: "character" })
export class CjsCharacterProjection extends CjsCharacterNode
{
    @type.string
    @io.persist
    id = "";

    @type.string
    @io.persist
    label = null;

    @type.float32
    @io.persist
    mode = 0;

    @type.float32
    @io.persist
    angleRotation = 0;

    @type.float32
    @io.persist
    aspectRatio = 1;

    @type.float32
    @io.persist
    azimuth = 0;

    @type.path
    @io.persist
    texturePath = null;

    @type.path
    @io.persist
    maskPath = null;

    @type.boolean
    @io.persist
    headEnabled = false;

    @type.boolean
    @io.persist
    bodyEnabled = false;

    @type.boolean
    @io.persist
    flipX = false;

    @type.boolean
    @io.persist
    flipY = false;

    @type.float32
    @io.persist
    height = 0;

    @type.float32
    @io.persist
    incline = 0;

    @type.int32
    @io.persist
    layer = 0;

    @type.boolean
    @io.persist
    maskPathEnabled = false;

    @type.vec2
    @io.persist
    offset = vec2.create();

    @type.float32
    @io.persist
    pitch = 0;

    @type.float32
    @io.persist
    planarBeta = 0;

    @type.float32
    @io.persist
    planarScale = 0;

    @type.vec3
    @io.persist
    position = vec3.create();

    @type.float32
    @io.persist
    radius = 0;

    @type.float32
    @io.persist
    roll = 0;

    @type.float32
    @io.persist
    scale = 0;

    @type.float32
    @io.persist
    yaw = 0;

}
