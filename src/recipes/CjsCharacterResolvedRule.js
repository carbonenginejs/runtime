import { io, type } from "@carbonenginejs/core-types/schema";
import { CjsCharacterNode } from "../CjsCharacterNode.js";

@type.define({ className: "CjsCharacterResolvedRule", family: "character" })
/** One metadata-only composition node activated by an authored recipe entry. */
export class CjsCharacterResolvedRule extends CjsCharacterNode
{
    @type.uint32
    @io.persist
    recipeEntryIndex = 0;

    @type.string
    @io.persist
    sourceID = "";

    @type.float32
    @io.persist
    weight = 1;

    @type.objectRef("CjsCharacterPartMetadata")
    @io.persist
    metadata = null;
}
