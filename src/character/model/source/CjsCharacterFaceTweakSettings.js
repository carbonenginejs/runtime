import { meta, type } from "#schema";

// Discovery: src/character/discovery/facetweaksettings.yaml
// Resource pattern: res:/graphics/character/global/facesetup/*

/**
 * Shared face tweak values; no rendering or composition behavior.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterFaceTweakSettings")
export class CjsCharacterFaceTweakSettings
{

    /** Authored names and gamma values. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.map("float64")
    gammaCurves = new Map();

    /** Authored numeric value, retained at JavaScript number precision. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    wrinkleMultiplier = 0;

    /** Authored numeric value, retained at JavaScript number precision. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    correctionMultiplier = 0;

}
