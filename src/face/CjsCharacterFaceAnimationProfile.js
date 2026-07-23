import { io, type } from "@carbonenginejs/core-types/schema";
import { CjsCharacterNode } from "../CjsCharacterNode.js";

@type.define({ className: "CjsCharacterFaceAnimationProfile", family: "character" })
/** Female and male face-animation settings for one ancestry. */
export class CjsCharacterFaceAnimationProfile extends CjsCharacterNode
{
    @type.objectRef("CjsCharacterFaceAnimationSetting")
    @io.persist
    female = null;

    @type.objectRef("CjsCharacterFaceAnimationSetting")
    @io.persist
    male = null;
}
