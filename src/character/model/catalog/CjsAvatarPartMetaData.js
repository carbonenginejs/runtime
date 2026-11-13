import { meta, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/**
 * Authored metadata associated with one character part source.
 * The name is observed as the YAML tag
 * `!!python/object:paperDoll.AvatarPartMetaData` in metadata.yaml content.
 *
 * `dependantModifiers` and `occludesModifiers` keep the raw authored strings.
 */
@meta.define({ name: "CjsAvatarPartMetaData", aliases: [ "paperDoll.AvatarPartMetaData" ] })
@meta.exposureChainTo(CjsCharacterRecord)
export class CjsAvatarPartMetaData extends CjsCharacterRecord
{

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.path
    sourcePath = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    alternativeTextureSourcePath = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.boolean
    forcesLooseTop = false;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.boolean
    hidesBootShin = false;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    lod1Replacement = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    lod2Replacement = "";

    /**
     * The part's colour-area count; -1 when the file does not state one, so a
     * reader can fall back to counting the areas its zone map selects.
     */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.int32
    numColorAreas = -1;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("string")
    dependantModifiers = [];

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("string")
    occludesModifiers = [];

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.int32
    soundTag = null;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.boolean
    swapTops = false;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.boolean
    swapBottom = false;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.boolean
    swapSocks = false;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.boolean
    wap = null;

}
