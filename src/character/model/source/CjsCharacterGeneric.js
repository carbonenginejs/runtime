import { meta, type } from "#schema";
import "./CjsCharacterDataCategory.js";
import "./CjsCharacterDataShader.js";
import "./CjsCharacterDataSex.js";
import { CjsCharacterDataBloodlines } from "./CjsCharacterDataBloodlines.js";

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
     * Which name rules give an archetype its bloodline and morph target, each value replacing the shipped default
     * (`factory/defaults/bloodlines.json`). Empty: the defaults are in force.
     */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.object.embed("CjsCharacterDataBloodlines")
    bloodlines = new CjsCharacterDataBloodlines();

}
