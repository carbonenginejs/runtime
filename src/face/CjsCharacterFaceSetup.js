import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsCharacterNode } from "../CjsCharacterNode.js";

@type.define({ className: "CjsCharacterFaceSetup", family: "character" })
/** Authored bind poses, animation values, controls, and shader tuning for faces. */
export class CjsCharacterFaceSetup extends CjsCharacterNode
{
    @type.map("CjsCharacterPose")
    @io.persist
    bindPoses = new Map();

    @type.map("CjsCharacterFaceAnimationProfile")
    @io.persist
    animation = new Map();

    @type.objectRef("CjsCharacterFaceControls")
    @io.persist
    controls = null;

    @type.objectRef("CjsCharacterFaceTweakSettings")
    @io.persist
    tweakSettings = null;
}
