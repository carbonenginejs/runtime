import { io, type } from "@carbonenginejs/core-types/schema";
import { CjsCharacterNode } from "../CjsCharacterNode.js";

@type.define({ className: "CjsCharacterUniqueCharacter", family: "character" })
/** Authored defaults and owned resources for one unique character-select model. */
export class CjsCharacterUniqueCharacter extends CjsCharacterNode
{
    @type.string
    @io.persist
    id = "";

    @type.string
    @io.persist
    sex = null;

    @type.objectRef("CjsCharacterResourceSet")
    @io.persist
    resources = null;

    @type.map("float32")
    @io.persist
    blendshapeWeights = new Map();

    @type.map("vec3")
    @io.persist
    animationOffsets = new Map();
}
