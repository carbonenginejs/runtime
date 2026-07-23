import { io, type } from "@carbonenginejs/core-types/schema";
import { CjsCharacterNode } from "./CjsCharacterNode.js";

@type.define({ className: "CjsCharacterFaceAnimationSetting", family: "character" })
/** Authored face-animation multipliers for one ancestry and sex. */
export class CjsCharacterFaceAnimationSetting extends CjsCharacterNode
{
    @type.float32
    @io.persist
    blinkMultiplier = 1;
}
