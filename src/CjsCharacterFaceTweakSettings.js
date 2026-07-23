import { io, type } from "@carbonenginejs/core-types/schema";
import { CjsCharacterNode } from "./CjsCharacterNode.js";

@type.define({ className: "CjsCharacterFaceTweakSettings", family: "character" })
/** Global wrinkle and correction-map tuning used by facial controls. */
export class CjsCharacterFaceTweakSettings extends CjsCharacterNode
{
    @type.map("float32")
    @io.persist
    gammaCurves = new Map();

    @type.float32
    @io.persist
    wrinkleMultiplier = 1;

    @type.float32
    @io.persist
    correctionMultiplier = 1;
}
