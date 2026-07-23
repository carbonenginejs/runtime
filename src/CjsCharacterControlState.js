import { io, type } from "@carbonenginejs/core-types/schema";
import { CjsCharacterNode } from "./CjsCharacterNode.js";

@type.define({ className: "CjsCharacterControlState", family: "character" })
/** Detached composed snapshot of live controls over a character graph. */
export class CjsCharacterControlState extends CjsCharacterNode
{
    @type.map("float32")
    @io.persist
    morphs = new Map();

    @type.map("float32")
    @io.persist
    parameters = new Map();

    @type.map("vec3")
    @io.persist
    boneOffsets = new Map();

    @type.string
    @io.persist
    activePose = "";

    @type.list("string")
    @io.persist
    appliedLayerIDs = [];
}
