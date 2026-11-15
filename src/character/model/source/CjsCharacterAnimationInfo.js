import { meta, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

// Discovery: src/character/discovery/animation_animinfo.yaml
// Resource pattern: res:/animation/*

/**
 * Named animation-info records from a single source.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterAnimationInfo")
@meta.exposureChainTo(CjsCharacterRecord)
export class CjsCharacterAnimationInfo extends CjsCharacterRecord
{

    /** Library identity for this unnamed root; not a key added to the original file. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /** The file's animations, each named by its key. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterAnimationInfoEntry")
    value = [];

}
