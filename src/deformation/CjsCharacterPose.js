import { io, type } from "@carbonenginejs/core-types/schema";
import { CjsCharacterNode } from "../CjsCharacterNode.js";

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
