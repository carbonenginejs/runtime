import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsCharacterNode } from "../CjsCharacterNode.js";

/**
 * Named, sex-scoped character composition preset made from authored recipe
 * entries.
 */
@type.define({ className: "CjsCharacterRecipe", family: "character" })
export class CjsCharacterRecipe extends CjsCharacterNode
{
    @type.string
    @io.persist
    id = "";

    @type.string
    @io.persist
    name = "";

    @type.string
    @io.persist
    sex = "";

    @type.list("CjsCharacterRecipeEntry")
    @io.persist
    entries = [];

}
