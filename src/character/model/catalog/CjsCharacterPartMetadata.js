import { exposure as be } from "#be";
import { meta, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/**
 * Authored metadata associated with one character part source.
 *
 * `dependentModifiers` and `occludesModifiers` keep the raw authored strings.
 * `dependencies` and `occlusions` hold ordered `CjsCharacterModifierReference`
 * projections beside them, each with its `authoredValue`, an
 * optional normalized unsuffixed `modifierPath`, and exact `partSource` /
 * `modifierLocation` relationships only when a join is exact.
 */
@meta.define("CjsCharacterPartMetadata")
export class CjsCharacterPartMetadata extends CjsCharacterRecord
{

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.path
    sourcePath = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    alternativeTextureSourcePath = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.boolean
    forcesLooseTop = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.boolean
    hidesBootShin = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    lod1Replacement = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    lod2Replacement = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.int32
    numColorAreas = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.list("string")
    dependentModifiers = [];

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
    swapTops = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.boolean
    swapBottom = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.boolean
    swapSocks = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.boolean
    wap = null;

}

export default CjsCharacterPartMetadata;
