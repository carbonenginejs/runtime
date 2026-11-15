import { meta, type } from "#schema";
import "./CjsCharacterDataParameterDouble.js";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

// Discovery: src/character/discovery/facetweaksettings.yaml
// Resource pattern: res:/graphics/character/global/facesetup/*

/**
 * Shared face tweak values; no rendering or composition behavior.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterFaceTweakSettings")
@meta.exposureChainTo(CjsCharacterRecord)
export class CjsCharacterFaceTweakSettings extends CjsCharacterRecord
{

    /** The wrinkle maps' fade-in powers, each named by its joint pair (or `default`), the key in the file. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterDataParameterDouble")
    gammaCurves = [];

    /** Authored numeric value, retained at JavaScript number precision. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    wrinkleMultiplier = 0;

    /** Authored numeric value, retained at JavaScript number precision. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    correctionMultiplier = 0;

}
