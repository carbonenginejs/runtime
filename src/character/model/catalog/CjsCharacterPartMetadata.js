import { edit, type } from "#schema";
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
@type.define({ className: "CjsCharacterPartMetadata", family: "character" })
export class CjsCharacterPartMetadata extends CjsCharacterRecord
{

    @edit.readwrite
    @edit.persist
    @type.path
    sourcePath = "";

    @edit.readwrite
    @edit.persist
    @type.string
    alternativeTextureSourcePath = null;

    @edit.readwrite
    @edit.persist
    @type.boolean
    forcesLooseTop = null;

    @edit.readwrite
    @edit.persist
    @type.boolean
    hidesBootShin = null;

    @edit.readwrite
    @edit.persist
    @type.string
    lod1Replacement = null;

    @edit.readwrite
    @edit.persist
    @type.string
    lod2Replacement = null;

    @edit.readwrite
    @edit.persist
    @type.int32
    numColorAreas = null;

    @edit.readwrite
    @edit.persist
    @type.list("string")
    dependentModifiers = [];

    @edit.readwrite
    @edit.persist
    @type.list("string")
    occludesModifiers = [];

    @edit.readwrite
    @edit.persist
    @type.list("CjsCharacterModifierReference")
    dependencies = [];

    @edit.readwrite
    @edit.persist
    @type.list("CjsCharacterModifierReference")
    occlusions = [];

    @edit.readwrite
    @edit.persist
    @type.int32
    soundTag = null;

    @edit.readwrite
    @edit.persist
    @type.boolean
    swapTops = null;

    @edit.readwrite
    @edit.persist
    @type.boolean
    swapBottom = null;

    @edit.readwrite
    @edit.persist
    @type.boolean
    swapSocks = null;

    @edit.readwrite
    @edit.persist
    @type.boolean
    wap = null;

}

export default CjsCharacterPartMetadata;
