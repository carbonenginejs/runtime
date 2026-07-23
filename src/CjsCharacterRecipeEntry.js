import { io, type } from "@carbonenginejs/core-types/schema";
import { vec4 } from "@carbonenginejs/core-math/vec4";
import { CjsCharacterNode } from "./CjsCharacterNode.js";

@type.define({ className: "CjsCharacterRecipeEntry", family: "character" })
/** One category/path/weight selection in a character recipe. */
export class CjsCharacterRecipeEntry extends CjsCharacterNode
{
    @type.string
    @io.persist
    category = "";

    @type.string
    @io.persist
    path = "";

    @type.float32
    @io.persist
    weight = 1;

    @type.string
    @io.persist
    colorVariation = null;

    @type.list("color")
    @io.persist
    colors = [];

    @type.list("color")
    @io.persist
    specularColors = [];

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
}
