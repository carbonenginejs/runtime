import { io, type } from "@carbonenginejs/core-types/schema";
import { CjsCharacterNode } from "../CjsCharacterNode.js";

@type.define({ className: "CjsCharacterModifierNameSet", family: "character" })
/** Ordered authored modifier-name inventories for one sex. */
export class CjsCharacterModifierNameSet extends CjsCharacterNode
{
    @type.list("string")
    @io.persist
    body = [];

    @type.list("string")
    @io.persist
    face = [];

    @type.list("string")
    @io.persist
    utility = [];
}
