import { io, type } from "@carbonenginejs/core-types/schema";
import { CjsCharacterNode } from "../CjsCharacterNode.js";

@type.define({ className: "CjsCharacterModifierNames", family: "character" })
/** Sex-specific authored modifier-name inventories. */
export class CjsCharacterModifierNames extends CjsCharacterNode
{
    @type.objectRef("CjsCharacterModifierNameSet")
    @io.persist
    female = null;

    @type.objectRef("CjsCharacterModifierNameSet")
    @io.persist
    male = null;
}
