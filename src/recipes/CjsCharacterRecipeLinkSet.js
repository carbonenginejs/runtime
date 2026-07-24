import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsCharacterNode } from "../CjsCharacterNode.js";

@type.define({ className: "CjsCharacterRecipeLinkSet", family: "character" })
/** Prepared links for one recipe, aligned by authored entry index. */
export class CjsCharacterRecipeLinkSet extends CjsCharacterNode
{
    @type.string
    @io.persist
    presetID = "";

    @type.string
    @io.persist
    sex = "";

    @type.list("CjsCharacterRecipeLink")
    @io.persist
    entries = [];
}
