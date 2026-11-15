import { meta, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

// Discovery: src/character/discovery/basefemalebindpose.yaml
// Discovery: src/character/discovery/basemalebindpose.yaml
// Resource pattern: res:/graphics/character/global/facesetup/*

/**
 * A source of bone-keyed bind-pose records; female and male source identities remain separate.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterBindPose")
@meta.exposureChainTo(CjsCharacterRecord)
export class CjsCharacterBindPose extends CjsCharacterRecord
{

    /** Library identity for this unnamed root; not a key added to the original file. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /** The bind pose's bone records, each named by its bone. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterPoseTransform")
    value = [];

}
