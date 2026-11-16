import { meta, type } from "#schema";
import "./CjsCharacterDataCategory.js";
import "./CjsCharacterDataShader.js";
import "./CjsCharacterDataSex.js";
import "./CjsCharacterDataTextureRole.js";
import "./CjsCharacterDataString.js";
import "./CjsCharacterDataNamedValue.js";
import "./CjsCharacterDataParameter.js";
import "./CjsCharacterDataMorphCorrection.js";
import "./CjsCharacterDataMeshDependant.js";
import "./CjsCharacterDataPartGroup.js";
import "./CjsCharacterDataBodyCarrier.js";
import "./CjsCharacterDataSourceType.js";
import "./CjsCharacterDataSourceRow.js";
import "./CjsCharacterDataListForm.js";
import "./CjsCharacterDataListFormPositional.js";
import "./CjsCharacterDataListFormRecords.js";

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
     * (`factory/defaults/generic.js`). Empty: the defaults are in force.
     */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterDataCategory")
    categories = [];

    /**
     * Area shaders' generic data, each overriding the shipped default for the same shader
     * (`factory/defaults/generic.js`). Empty: the defaults are in force.
     */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterDataShader")
    areaShaders = [];

    /**
     * Each character sex's resource facts, one per sex `name`, each replacing the shipped default of that sex
     * (`factory/defaults/generic.js`). Empty: the defaults are in force.
     */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterDataSex")
    sexes = [];

    /**
     * The name rule that gives an archetype's bloodline from the head that depends on it, replacing the shipped
     * default (`factory/defaults/generic.js`, which says what each rule does). Empty: the default is in force.
     */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    bloodlineRule = "";

    /**
     * The name rule that gives the morph target an archetype drives, replacing the shipped default
     * (`factory/defaults/generic.js`). Empty: the default is in force.
     */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    bloodlineMorphTargetRule = "";

    /**
     * The paper doll texture tables (`CjsCharacterTextureRoles`): the five members below are one set. An installed
     * library that holds texture roles (`textureRoles` not empty) replaces the shipped set whole
     * (`factory/defaults/generic.js`, which says what each value means). Empty: the defaults are in force.
     */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterDataTextureRole")
    textureRoles = [];

    /** The regions a texture file name can carry (`head`, `body`, `hair`, `acc`); one set with `textureRoles`. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterDataString")
    textureRegions = [];

    /** The character atlas's regions, as an area's `TransformUV0` places them: each region `name` and its [u0, v0, u1, v1]. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterDataParameter")
    textureAtlas = [];

    /** How far an authored rect may lie outside an atlas region and still be placed in it. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    textureAtlasTolerance = 0;

    /** The garment map names: each map they give (`name`: `detail`, `normal`) with one name per entry, searched in order. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterDataNamedValue")
    textureGarmentMaps = [];

    /**
     * Morph corrections, one per `name`, each replacing the shipped default of that name (`factory/defaults/generic.js`).
     * Empty: the defaults are in force.
     */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterDataMorphCorrection")
    morphCorrections = [];

    /**
     * The dependant meshes the paper doll draws, one per `path`, each replacing the shipped default of that path
     * (`factory/defaults/generic.js`). Empty: the defaults are in force.
     */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterDataMeshDependant")
    meshDependants = [];

    /**
     * The paper doll parts that cannot be worn together, one group each. An installed library that holds groups replaces
     * the shipped set whole (`factory/defaults/generic.js`). Empty: the defaults are in force.
     */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterDataPartGroup")
    exclusiveParts = [];

    /**
     * The body carrier rules (`CjsCharacterLibraryManager.FetchBodyCarriers`): the members from here to
     * `backingCutoutAlpha` are one set. An installed library that holds body carriers (`bodyCarriers` not empty)
     * replaces the shipped set whole (`factory/defaults/generic.js`). Empty: the defaults are in force.
     */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterDataBodyCarrier")
    bodyCarriers = [];

    /** The dependant categories whose models are body pieces a garment can ask for (sleeves, collar, hood). */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterDataString")
    bodyCarrierGarmentDependants = [];

    /** The resource a nude carrier area the composed cut mask clips holds (`CutMaskMap`). */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    cutMaskClipResource = "";

    /** The parameter whose value says how much the cut mask owns an area's alpha (`CutMaskInfluence`). */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    cutMaskClipInfluence = "";

    /** The influence above which an area is clipped. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float32
    cutMaskClipAbove = 0;

    /** The parameter a clipped area has set to 1 (`DecalClip`). */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    cutMaskClipParameter = "";

    /** The share of a garment mesh's bind-pose vertices on a carrier mesh at or above which it is the carrier's copy. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    meshCopyShare = 0;

    /** The scale bind-pose positions are compared at (10000: to 0.1 mm). */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float32
    meshCopyPositionScale = 0;

    /** Whether a nude carrier's cut-mask shells draw. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.boolean
    shellsDraw = false;

    /** The cutout colour parameter of a carrier's opaque and decal areas (`MaterialCutoutColor`). */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    backingCutoutParameter = "";

    /** The cutout weight those areas are set to, when theirs is above it. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float32
    backingCutoutAlpha = 0;

    /** The `res:` roots the library indexes (`res:/graphics/character/`). */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string.array()
    sourceRoots = [];

    /** The `res:` patterns below the roots it never indexes (Python files, pickles, texture mip files). */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string.array()
    sourceExcludes = [];

    /** The library's source types: each its record class, file shape and layout. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.object.embed.array("CjsCharacterDataSourceType")
    sourceTypes = [];

    /** The path rules: which files are of which source type. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.object.embed.array("CjsCharacterDataSourceRow")
    sourceRows = [];

    /** The `res:` patterns (without extension) of the `.black`/`.red` resources it indexes by path. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string.array()
    sourceBlackPatterns = [];

    /** The `res:/staticdata/<name>.fsdbinary` files it indexes by path. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string.array()
    sourceStaticNames = [];

    /** How the reader lays a record class's file keys onto its fields: one record per class and key, by form. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.object.embed.array("CjsCharacterDataListForm")
    sourceListForms = [];

}
