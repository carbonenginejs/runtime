import { meta, type, blue } from "#schema";
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

    @blue.readwrite
    @blue.persist
    @type.path
    sourcePath = "";

    @blue.readwrite
    @blue.persist
    @type.string
    alternativeTextureSourcePath = null;

    @blue.readwrite
    @blue.persist
    @type.boolean
    forcesLooseTop = null;

    @blue.readwrite
    @blue.persist
    @type.boolean
    hidesBootShin = null;

    @blue.readwrite
    @blue.persist
    @type.string
    lod1Replacement = null;

    @blue.readwrite
    @blue.persist
    @type.string
    lod2Replacement = null;

    @blue.readwrite
    @blue.persist
    @type.int32
    numColorAreas = null;

    @blue.readwrite
    @blue.persist
    @type.list("string")
    dependentModifiers = [];

    @blue.readwrite
    @blue.persist
    @type.list("string")
    occludesModifiers = [];

    @blue.readwrite
    @blue.persist
    @type.list("CjsCharacterModifierReference")
    dependencies = [];

    @blue.readwrite
    @blue.persist
    @type.list("CjsCharacterModifierReference")
    occlusions = [];

    @blue.readwrite
    @blue.persist
    @type.int32
    soundTag = null;

    @blue.readwrite
    @blue.persist
    @type.boolean
    swapTops = null;

    @blue.readwrite
    @blue.persist
    @type.boolean
    swapBottom = null;

    @blue.readwrite
    @blue.persist
    @type.boolean
    swapSocks = null;

    @blue.readwrite
    @blue.persist
    @type.boolean
    wap = null;

}

export default CjsCharacterPartMetadata;
