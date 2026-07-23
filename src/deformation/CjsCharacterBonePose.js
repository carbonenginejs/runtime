import { io, type } from "@carbonenginejs/core-types/schema";
import { vec3 } from "@carbonenginejs/core-math/vec3";
import { CjsCharacterNode } from "../CjsCharacterNode.js";

@type.define({ className: "CjsCharacterBonePose", family: "character" })
/** Authored transform values for one named character bone. */
export class CjsCharacterBonePose extends CjsCharacterNode
{
    @type.string
    @io.persist
    name = "";

    @type.vec3
    @io.persist
    orientation = vec3.create();

    @type.vec3
    @io.persist
    rotation = vec3.create();

    @type.vec3
    @io.persist
    translation = vec3.create();
}
