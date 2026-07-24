import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsCharacterNode } from "../CjsCharacterNode.js";

@type.define({ className: "CjsCharacterBlendshapeLimits", family: "character" })
/** Per-head minimum and maximum values for named blendshape controls. */
export class CjsCharacterBlendshapeLimits extends CjsCharacterNode
{
    @type.string
    @io.persist
    id = "";

    @type.string
    @io.persist
    sex = "";

    @type.string
    @io.persist
    head = "";

    @type.map("vec2")
    @io.persist
    limits = new Map();

}
