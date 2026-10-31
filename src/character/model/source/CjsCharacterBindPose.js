import { meta, type } from "#schema";

// Discovery: src/character/discovery/basefemalebindpose.yaml
// Discovery: src/character/discovery/basemalebindpose.yaml
// Resource pattern: res:/graphics/character/global/facesetup/*

/**
 * A source of bone-keyed bind-pose records; female and male source identities remain separate.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterBindPose")
export class CjsCharacterBindPose
{

    /** Library identity for this unnamed root; not a key added to the original file. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /** Authored bone keys and bind-pose records. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.map({ kind: "rootRef", className: "CjsCharacterPoseTransform" })
    value = new Map();

}
