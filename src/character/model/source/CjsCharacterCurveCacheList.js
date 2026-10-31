import { meta, type } from "#schema";

// Discovery: src/character/discovery/scenes_curve_cache_list.yaml
// Resource pattern: res:/animation_gstate/scenes/*

/**
 * An ordered source list of curve-set references.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterCurveCacheList")
export class CjsCharacterCurveCacheList
{

    /** Library identity for this unnamed root; not a key added to the original file. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /** Authored curve-set paths; no .red/.black rewrite is applied. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list({ kind: "path", accepts: ["TriCurveSet"] })
    value = [];

}
