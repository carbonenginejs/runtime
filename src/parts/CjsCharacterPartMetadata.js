import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsCharacterNode } from "../CjsCharacterNode.js";

@type.define({ className: "CjsCharacterPartMetadata", family: "character" })
/** Composition rules normalized from paperdoll part metadata. */
export class CjsCharacterPartMetadata extends CjsCharacterNode
{
    @type.string
    @io.persist
    id = "";

    @type.path
    @io.persist
    alternativeTextureSourcePath = null;

    @type.boolean
    @io.persist
    forcesLooseTop = null;

    @type.boolean
    @io.persist
    hidesBootShin = null;

    @type.path
    @io.persist
    lod1Replacement = null;

    @type.path
    @io.persist
    lod2Replacement = null;

    @type.uint32
    @io.persist
    numColorAreas = null;

    @type.list("string")
    @io.persist
    dependentModifiers = [];

    @type.list("string")
    @io.persist
    occludesModifiers = [];

    @type.uint32
    @io.persist
    soundTag = null;

    @type.boolean
    @io.persist
    swapTops = null;

    @type.boolean
    @io.persist
    swapBottom = null;

    @type.boolean
    @io.persist
    swapSocks = null;

    @type.boolean
    @io.persist
    wap = null;
}
