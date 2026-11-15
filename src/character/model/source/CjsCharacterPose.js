import { meta, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

// Discovery: src/character/discovery/pose.yaml
// Resource pattern: res:/graphics/character/*

/**
 * A named source containing bone-keyed pose records.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterPose")
@meta.exposureChainTo(CjsCharacterRecord)
export class CjsCharacterPose extends CjsCharacterRecord
{

    /** Library identity for this unnamed root; not a key added to the original file. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /** The pose's bone records, each named by its bone; not a SOF transform. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterPoseTransform")
    value = [];

}
