import { meta, type } from "#schema";

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

}
