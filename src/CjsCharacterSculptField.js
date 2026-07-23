import { io, type } from "@carbonenginejs/core-types/schema";
import { vec3 } from "@carbonenginejs/core-math/vec3";
import { CjsCharacterNode } from "./CjsCharacterNode.js";

@type.define({ className: "CjsCharacterSculptField", family: "character" })
/** Triangle field mapping a two-dimensional control surface to morph weights. */
export class CjsCharacterSculptField extends CjsCharacterNode
{
    @type.string
    @io.persist
    id = "";

    @type.string
    @io.persist
    name = "";

    @type.list("string")
    @io.persist
    attributes = [];

    @type.vec3
    @io.persist
    markerPosition = vec3.create();

    @type.list("CjsCharacterSculptVertex")
    @io.persist
    vertices = [];

    @type.list("CjsCharacterSculptTriangle")
    @io.persist
    triangles = [];

}
