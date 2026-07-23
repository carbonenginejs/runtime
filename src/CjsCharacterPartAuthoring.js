import { io, type } from "@carbonenginejs/core-types/schema";
import { CjsCharacterNode } from "./CjsCharacterNode.js";

@type.define({ className: "CjsCharacterPartAuthoring", family: "character" })
/** Non-runtime DCC/exporter metadata retained with a paperdoll part source. */
export class CjsCharacterPartAuthoring extends CjsCharacterNode
{
    @type.unknown
    @io.persist
    materialInfo = null;
}
