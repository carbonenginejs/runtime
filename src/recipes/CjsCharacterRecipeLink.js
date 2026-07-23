import { io, type } from "@carbonenginejs/core-types/schema";
import { CjsCharacterNode } from "../CjsCharacterNode.js";

@type.define({ className: "CjsCharacterRecipeLink", family: "character" })
/** One prepared, index-aligned interpretation of an authored recipe entry. */
export class CjsCharacterRecipeLink extends CjsCharacterNode
{
    @type.uint32
    @io.persist
    entryIndex = 0;

    @type.string
    @io.persist
    kind = "";

    @type.string
    @io.persist
    status = "unresolved";

    @type.string
    @io.persist
    sourceID = null;

    @type.string
    @io.persist
    partID = null;

    @type.string
    @io.persist
    metadataID = null;

    @type.string
    @io.persist
    materialID = null;

    @type.string
    @io.persist
    morphName = null;

    @type.list("string")
    @io.persist
    candidatePartIDs = [];

    @type.string
    @io.persist
    issueCode = null;
}
