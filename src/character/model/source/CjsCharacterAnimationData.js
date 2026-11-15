import { meta, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

// Discovery: src/character/discovery/animationdata.yaml
// Resource pattern: res:/graphics/character/global/facesetup/*

/**
 * Named animation settings retaining separate male and female values.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterAnimationData")
@meta.exposureChainTo(CjsCharacterRecord)
export class CjsCharacterAnimationData extends CjsCharacterRecord
{

    /** Library identity for this unnamed root; not a key added to the original file. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /** The file's entries, each named by its key. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterAnimationDataEntry")
    value = [];

}
