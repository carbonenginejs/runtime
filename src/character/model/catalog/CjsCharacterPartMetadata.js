import { io, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Authored metadata associated with one character part source. */
@type.define({ className: "CjsCharacterPartMetadata", family: "character" })
export class CjsCharacterPartMetadata extends CjsCharacterRecord
{

    @io.readwrite
    @type.path
    sourcePath = "";

    @io.readwrite
    @type.string
    alternativeTextureSourcePath = null;

    @io.readwrite
    @type.boolean
    forcesLooseTop = null;

    @io.readwrite
    @type.boolean
    hidesBootShin = null;

    @io.readwrite
    @type.string
    lod1Replacement = null;

    @io.readwrite
    @type.string
    lod2Replacement = null;

    @io.readwrite
    @type.int32
    numColorAreas = null;

    @io.readwrite
    @type.list("string")
    dependentModifiers = [];

    @io.readwrite
    @type.list("string")
    occludesModifiers = [];

    @io.readwrite
    @type.list("CjsCharacterModifierReference")
    dependencies = [];

    @io.readwrite
    @type.list("CjsCharacterModifierReference")
    occlusions = [];

    @io.readwrite
    @type.int32
    soundTag = null;

    @io.readwrite
    @type.boolean
    swapTops = null;

    @io.readwrite
    @type.boolean
    swapBottom = null;

    @io.readwrite
    @type.boolean
    swapSocks = null;

    @io.readwrite
    @type.boolean
    wap = null;

}

export default CjsCharacterPartMetadata;
