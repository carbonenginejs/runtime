import { io, type } from "@carbonenginejs/core-types/schema";
import { vec2 } from "@carbonenginejs/core-math/vec2";
import { vec3 } from "@carbonenginejs/core-math/vec3";
import { CjsCharacterNode } from "../CjsCharacterNode.js";

@type.define({ className: "CjsCharacterSculptVertex", family: "character" })
/** One normalized vertex in a character sculpting control field. */
export class CjsCharacterSculptVertex extends CjsCharacterNode
{
    @type.uint32
    @io.persist
    index = 0;

    @type.vec3
    @io.persist
    position = vec3.create();

    @type.vec2
    @io.persist
    coordinates = vec2.create();

    @type.map("float32")
    @io.persist
    weights = new Map();
}
