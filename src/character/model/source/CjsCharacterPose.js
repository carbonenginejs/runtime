import { meta, type } from "#schema";

// Discovery: src/character/discovery/pose.yaml
// Resource pattern: res:/graphics/character/*

/**
 * A named source containing bone-keyed pose records.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterPose")
export class CjsCharacterPose
{

    /** Library identity for this unnamed root; not a key added to the original file. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /** Authored bone keys and pose records; not a SOF transform. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.map({ kind: "rootRef", className: "CjsCharacterPoseTransform" })
    value = new Map();

}
