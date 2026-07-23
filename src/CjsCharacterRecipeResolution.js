import { io, type } from "@carbonenginejs/core-types/schema";
import { CjsCharacterNode } from "./CjsCharacterNode.js";

@type.define({ className: "CjsCharacterRecipeResolution", family: "character" })
/** Prepared runtime result that never hides ambiguous or unresolved recipe entries. */
export class CjsCharacterRecipeResolution extends CjsCharacterNode
{
    @type.struct("CjsCharacterRecipe")
    @io.persist
    recipe = null;

    @type.list("CjsCharacterResolvedPart")
    @io.persist
    parts = [];

    @type.list("CjsCharacterResolvedRule")
    @io.persist
    rules = [];

    @type.map("float32")
    @io.persist
    morphs = new Map();

    @type.list("string")
    @io.persist
    materialIDs = [];

    @type.list("CjsCharacterResolutionIssue")
    @io.persist
    issues = [];

    @type.boolean
    @io.persist
    complete = false;
}
