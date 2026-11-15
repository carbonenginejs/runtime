import { meta, type } from "#schema";
import "./CjsCharacterDataCategory.js";
import "./CjsCharacterDataShader.js";
import "./CjsCharacterDataSex.js";
import "./CjsCharacterDataTextureRole.js";

// Discovery: src/character/discovery/animationdata.yaml
// Discovery: src/character/discovery/{animation_animinfo,animation_movementstates,animationoffsets,basefemalebindpose,basemalebindpose,basename,blendshapes,face,facetweaksettings,modifiernames,scultpinglimits,trif}.yaml
// Resource patterns: res:/graphics/character/*; res:/animation/*.yaml

/**
 * Shared character configuration holdings. Each list retains separate source documents; no source maps are merged.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterGeneric")
export class CjsCharacterGeneric
{

    /** Distinct animationInfo source documents, indexed by the library. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterAnimationInfo")
    animationInfo = [];

    /** Distinct movementStates source documents, indexed by the library. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterMovementStates")
    movementStates = [];

    /** Distinct animationData source documents, indexed by the library. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterAnimationData")
    animationData = [];

    /** Distinct animationOffsets source documents, indexed by the library. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterAnimationOffsets")
    animationOffsets = [];

    /** Distinct bindPoses source documents, indexed by the library. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterBindPose")
    bindPoses = [];

    /** Distinct postBaseNames source documents, indexed by the library. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterPostBaseNames")
    postBaseNames = [];

    /** Distinct blendShapes source documents, indexed by the library. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterBlendShapes")
    blendShapes = [];

    /** Distinct faceMappings source documents, indexed by the library. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterFaceMapping")
    faceMappings = [];

    /** Distinct faceTweakSettings source documents, indexed by the library. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterFaceTweakSettings")
    faceTweakSettings = [];

    /** Distinct modifierNames source documents, indexed by the library. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterModifierNames")
    modifierNames = [];

    /** Distinct sculptingLimits source documents, indexed by the library. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterSculptingLimits")
    sculptingLimits = [];

    /** Distinct fieldSets source documents, indexed by the library. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterFieldSet")
    fieldSets = [];

    /**
     * Paper doll category rules, one per category path `name`, each overriding the shipped default of that name
     * (`factory/defaults/categories.json`). Empty: the defaults are in force.
     */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterDataCategory")
    categories = [];

    /**
     * Area shaders' generic data, each overriding the shipped default for the same shader
     * (`factory/defaults/areaShaders.json`). Empty: the defaults are in force.
     */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterDataShader")
    areaShaders = [];

    /**
     * Each character sex's resource facts, one per sex `name`, each replacing the shipped default of that sex
     * (`factory/defaults/sexes.json`). Empty: the defaults are in force.
     */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterDataSex")
    sexes = [];

    /**
     * The name rule that gives an archetype's bloodline from the head that depends on it, replacing the shipped
     * default (`factory/defaults/bloodlines.json`, which says what each rule does). Empty: the default is in force.
     */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    bloodlineRule = "";

    /**
     * The name rule that gives the morph target an archetype drives, replacing the shipped default
     * (`factory/defaults/bloodlines.json`). Empty: the default is in force.
     */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    bloodlineMorphTargetRule = "";

    /**
     * The paper doll texture tables (`CjsCharacterTextureRoles`): the five members below are one set. An installed
     * library that holds texture roles (`textureRoles` not empty) replaces the shipped set whole
     * (`factory/defaults/textureRoles.json`, which says what each value means). Empty: the defaults are in force.
     */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterDataTextureRole")
    textureRoles = [];

    /** The regions a texture file name can carry (`head`, `body`, `hair`, `acc`); one set with `textureRoles`. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("string")
    textureRegions = [];

    /** The character atlas's regions, as an area's `TransformUV0` places them, [u0, v0, u1, v1] by region. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.map({ kind: "list", itemType: "float64" })
    textureAtlas = new Map();

    /** How far an authored rect may lie outside an atlas region and still be placed in it. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    textureAtlasTolerance = 0;

    /** The garment map names, by the map they give (`detail`, `normal`), each searched in order. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.map({ kind: "list", itemType: "string" })
    textureGarmentMaps = new Map();

}
