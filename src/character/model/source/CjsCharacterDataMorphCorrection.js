import { meta, type } from "#schema";
import "./CjsCharacterDataMorphCorrectionMesh.js";

/**
 * One morph correction: a rule the library applies on top of a model's shipped morph data in memory, the shipped
 * files never changed (`CjsCharacterMorphCorrections`). The generic holds these in a list keyed by `name`
 * (`CjsCharacterGeneric.morphCorrections`); the shipped defaults are `factory/defaults/generic.js`.
 *
 * Ours (no Carbon counterpart): Carbon applies shipped morph data as it is.
 */
@meta.define("CjsCharacterDataMorphCorrection")
export class CjsCharacterDataMorphCorrection
{

    /** The correction's id (`male-head-weight-face`). */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /** The model's resource path, compared without case. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    model = "";

    /** The morph target, a name pattern (`^fatShape`). */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    morph = "";

    /** The meshes it covers, each by `name`. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterDataMorphCorrectionMesh")
    meshes = [];

    /** How far, in metres, a mirror partner may sit from the mirrored position. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float32
    mirrorTolerance = 0;

    /** The position key that joins a vertex's UV-seam copies. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float32
    seamPrecision = 0;

    /** The mirror search grid's cell, in metres. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float32
    cell = 0;

    /** How much skin, in metres, a carried mesh averages its change over. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float32
    carrySmoothing = 0;

}
