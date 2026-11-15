import { meta, type } from "#schema";
import "./CjsCharacterSculptingLimit.js";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

// Discovery: src/character/discovery/scultpinglimits.yaml
// Resource pattern: res:/graphics/character/global/facesetup/scultpinglimits/*

/**
 * Sculpting limits from the authored scultpinglimits filename.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterSculptingLimits")
@meta.exposureChainTo(CjsCharacterRecord)
export class CjsCharacterSculptingLimits extends CjsCharacterRecord
{

    /** Authored string, retained without normalization of spelling. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    gender = "";

    /** Authored string, retained without normalization of spelling. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    head = "";

    /** The shapes' limits, each named by its shape, the key in the file (a repeated key keeps its last pair). */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterSculptingLimit")
    limits = [];

}
