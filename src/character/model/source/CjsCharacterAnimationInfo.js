import { meta, type } from "#schema";

// Discovery: src/character/discovery/animation_animinfo.yaml
// Resource pattern: res:/animation/*

/**
 * Named animation-info records from a single source.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterAnimationInfo")
export class CjsCharacterAnimationInfo
{

    /** Library identity for this unnamed root; not a key added to the original file. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /** Authored identifier keys and records. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.map({ kind: "rootRef", className: "CjsCharacterAnimationInfoEntry" })
    value = new Map();

}
