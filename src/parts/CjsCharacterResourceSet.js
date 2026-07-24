import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsCharacterNode } from "../CjsCharacterNode.js";

@type.define({ className: "CjsCharacterResourceSet", family: "character" })
/** Configuration and texture resources owned by a non-paperdoll character profile. */
export class CjsCharacterResourceSet extends CjsCharacterNode
{
    @type.list("path")
    @io.persist
    configPaths = [];

    @type.list("path")
    @io.persist
    texturePaths = [];
}
