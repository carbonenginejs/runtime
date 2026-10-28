import { meta, type } from "#schema";

// Discovery: src/character/discovery/scenes_scene.yaml
// Resource pattern: res:/animation_gstate/scenes/*

/**
 * One scene character record with source references, not a built character.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterSceneCharacter")
export class CjsCharacterSceneCharacter
{

    /** Authored audio event name, not a resource path. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.string
    animation_lipsync_audio = "";

    /** Authored string or integer; preserve the observed union without coercion. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.unknown
    animation_lipsync_audio_delay = 0;

    /** Authored resource reference; resolution never replaces this string. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.path(".gsf")
    animation_path = "";

    /** Authored curve-set paths in source order. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list({ kind: "path", accepts: ["TriCurveSet"] })
    curveset = [];

    /** Authored string, retained without normalization of spelling. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.string
    gender = "";

    /** Authored resource reference; resolution never replaces this string. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.path("CjsCharacterPosition")
    position_path = "";

    /** Authored string, retained without normalization of spelling. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.string
    prs_name = "";

    /** Authored resource reference; resolution never replaces this string. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.path(".prs")
    prs_path = "";

    /** Optional authored custom flag. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.boolean
    custom = false;

}
