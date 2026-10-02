import { meta } from "#schema";
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
@meta.define({ className: "CjsCharacterPartMetadata", family: "character" })
export class CjsCharacterPartMetadata extends CjsCharacterRecord
{

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.path
    sourcePath = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    alternativeTextureSourcePath = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.boolean
    forcesLooseTop = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.boolean
    hidesBootShin = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    lod1Replacement = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    lod2Replacement = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.int32
    numColorAreas = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.list("string")
    dependentModifiers = [];

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.list("string")
    occludesModifiers = [];

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.list("CjsCharacterModifierReference")
    dependencies = [];

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.list("CjsCharacterModifierReference")
    occlusions = [];

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.int32
    soundTag = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.boolean
    swapTops = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.boolean
    swapBottom = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.boolean
    swapSocks = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.boolean
    wap = null;

}

export default CjsCharacterPartMetadata;
