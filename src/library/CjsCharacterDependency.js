import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsCharacterNode } from "../CjsCharacterNode.js";

@type.define({ className: "CjsCharacterDependency", family: "character" })
/** Inert resource dependency; loading belongs to an outer adapter. */
export class CjsCharacterDependency extends CjsCharacterNode
{
    @type.string
    @io.persist
    id = "";

    @type.path
    @io.persist
    path = "";

    @type.string
    @io.persist
    kind = "unknown";

    @type.boolean
    @io.persist
    required = true;

    @type.string
    @io.persist
    role = "";

    @type.unknown
    @io.persist
    source = null;
}
