import { io, type } from "@carbonenginejs/core-types/schema";
import { CjsCharacterNode } from "../CjsCharacterNode.js";

@type.define({ className: "CjsCharacterResolutionIssue", family: "character" })
/** One explicit diagnostic produced while resolving an authored recipe. */
export class CjsCharacterResolutionIssue extends CjsCharacterNode
{
    @type.int32
    @io.persist
    entryIndex = -1;

    @type.string
    @io.persist
    code = "";

    @type.string
    @io.persist
    message = "";

    @type.boolean
    @io.persist
    blocking = true;

    @type.list("string")
    @io.persist
    candidatePartIDs = [];
}
