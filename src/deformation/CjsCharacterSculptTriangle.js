import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsCharacterNode } from "../CjsCharacterNode.js";

@type.define({ className: "CjsCharacterSculptTriangle", family: "character" })
/** Three vertex indexes forming one sculpting-field triangle. */
export class CjsCharacterSculptTriangle extends CjsCharacterNode
{
    @type.list("uint32")
    @io.persist
    indices = [];
}
