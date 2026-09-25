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
    @type.path
    sourcePath = "";

    @edit.readwrite
    @type.string
    alternativeTextureSourcePath = null;

    @edit.readwrite
    @type.boolean
    forcesLooseTop = null;

    @edit.readwrite
    @type.boolean
    hidesBootShin = null;

    @edit.readwrite
    @type.string
    lod1Replacement = null;

    @edit.readwrite
    @type.string
    lod2Replacement = null;

    @edit.readwrite
    @type.int32
    numColorAreas = null;

    @edit.readwrite
    @type.list("string")
    dependentModifiers = [];

    @edit.readwrite
    @type.list("string")
    occludesModifiers = [];

    @edit.readwrite
    @type.list("CjsCharacterModifierReference")
    dependencies = [];

    @edit.readwrite
    @type.list("CjsCharacterModifierReference")
    occlusions = [];

    @edit.readwrite
    @type.int32
    soundTag = null;

    @edit.readwrite
    @type.boolean
    swapTops = null;

    @edit.readwrite
    @type.boolean
    swapBottom = null;

    @edit.readwrite
    @type.boolean
    swapSocks = null;

    @edit.readwrite
    @type.boolean
    wap = null;

}

export default CjsCharacterPartMetadata;
