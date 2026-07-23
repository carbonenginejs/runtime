import { io, type } from "@carbonenginejs/core-types/schema";
import { CjsCharacterNode } from "./CjsCharacterNode.js";

@type.define({ className: "CjsCharacterVisemeFrame", family: "character" })
/** One timed snapshot of independent authored viseme weights. */
export class CjsCharacterVisemeFrame extends CjsCharacterNode
{
    @type.float32
    @io.persist
    time = 0;

    @type.map("float32")
    @io.persist
    weights = new Map();
}
