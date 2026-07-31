import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsCharacterNode } from "../CjsCharacterNode.js";

/** Named character pose composed of authored per-bone transform values. */
@type.define({ className: "CjsCharacterPose", family: "character" })
export class CjsCharacterPose extends CjsCharacterNode
{
    @type.string
    @io.persist
    id = "";

    @type.string
    @io.persist
    name = "";

    @type.list("CjsCharacterBonePose")
    @io.persist
    bones = [];

}
