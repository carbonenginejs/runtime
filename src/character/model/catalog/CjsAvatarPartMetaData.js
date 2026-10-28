import { exposure as be } from "#be";
import { meta, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/**
 * Authored metadata associated with one character part source.
 * The name is observed as the YAML tag
 * `!!python/object:paperDoll.AvatarPartMetaData` in metadata.yaml content.
 *
 * `dependantModifiers` and `occludesModifiers` keep the raw authored strings.
 * `dependencies` and `occlusions` hold ordered `CjsCharacterModifierReference`
 * projections beside them, each with its `authoredValue`, an
 * optional normalized unsuffixed `modifierPath`, and exact `partSource` /
 * `modifierLocation` relationships only when a join is exact.
 */
@meta.define("CjsAvatarPartMetaData")
export class CjsAvatarPartMetaData extends CjsCharacterRecord
{

    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.path
    sourcePath = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.string
    alternativeTextureSourcePath = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.boolean
    forcesLooseTop = false;

    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.boolean
    hidesBootShin = false;

    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.string
    lod1Replacement = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.string
    lod2Replacement = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.int32
    numColorAreas = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list("string")
    dependantModifiers = [];

    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list("string")
    occludesModifiers = [];

    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterModifierReference")
    dependencies = [];

    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterModifierReference")
    occlusions = [];

    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.int32
    soundTag = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.boolean
    swapTops = false;

    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.boolean
    swapBottom = false;

    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.boolean
    swapSocks = false;

    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.boolean
    wap = null;

}

export default CjsAvatarPartMetaData;
