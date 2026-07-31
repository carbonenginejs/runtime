import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { CjsCharacterNode } from "../CjsCharacterNode.js";

/**
 * Character material descriptor for a slot, including colors, pattern
 * controls, parameters, and resource paths.
 */
@type.define({ className: "CjsCharacterMaterial", family: "character" })
export class CjsCharacterMaterial extends CjsCharacterNode
{
    @type.string
    @io.persist
    id = "";

    @type.string
    @io.persist
    slot = "";

    @type.list("color")
    @io.persist
    colors = [];

    @type.string
    @io.persist
    pattern = null;

    @type.list("color")
    @io.persist
    patternColors = [];

    @type.vec4
    @io.persist
    patternTransform = vec4.fromValues(0, 0, 1, 1);

    @type.float32
    @io.persist
    patternRotation = 0;

    @type.list("color")
    @io.persist
    specularColors = [];

    @type.unknown
    @io.persist
    parameters = {};

    @type.list("path")
    @io.persist
    resourcePaths = [];

}
