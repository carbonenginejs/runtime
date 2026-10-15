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

    @meta.readwrite
    @meta.persist
    @type.path
    sourcePath = "";

    @meta.readwrite
    @meta.persist
    @type.string
    alternativeTextureSourcePath = null;

    @meta.readwrite
    @meta.persist
    @type.boolean
    forcesLooseTop = null;

    @meta.readwrite
    @meta.persist
    @type.boolean
    hidesBootShin = null;

    @meta.readwrite
    @meta.persist
    @type.string
    lod1Replacement = null;

    @meta.readwrite
    @meta.persist
    @type.string
    lod2Replacement = null;

    @meta.readwrite
    @meta.persist
    @type.int32
    numColorAreas = null;

    @meta.readwrite
    @meta.persist
    @type.list("string")
    dependentModifiers = [];

    @meta.readwrite
    @meta.persist
    @type.list("string")
    occludesModifiers = [];

    @meta.readwrite
    @meta.persist
    @type.list("CjsCharacterModifierReference")
    dependencies = [];

    @meta.readwrite
    @meta.persist
    @type.list("CjsCharacterModifierReference")
    occlusions = [];

    @meta.readwrite
    @meta.persist
    @type.int32
    soundTag = null;

    @meta.readwrite
    @meta.persist
    @type.boolean
    swapTops = null;

    @meta.readwrite
    @meta.persist
    @type.boolean
    swapBottom = null;

    @meta.readwrite
    @meta.persist
    @type.boolean
    swapSocks = null;

    @meta.readwrite
    @meta.persist
    @type.boolean
    wap = null;

}

export default CjsCharacterPartMetadata;
