import { meta, type } from "#schema";

// Discovery: src/character/discovery/curvesets_metadata.yaml
// Resource pattern: res:/animation_gstate/scenes/*

/**
 * Authored curve-set metadata, retaining snake_case and the stored type field.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterCurveSetMetadata")
export class CjsCharacterCurveSetMetadata
{

    /** Authored integer value. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.int32
    cue_level = 0;

    /** Authored curve-set name, retained as written. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    curveset = "";

    /** Authored string, retained without normalization of spelling. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    description = "";

    /** Authored string, retained without normalization of spelling. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /** Authored string, retained without normalization of spelling. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    object_name = "";

    /** Authored numeric value, retained at JavaScript number precision. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    offset = 0;

    /** Authored string, retained without normalization of spelling. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    original_name = "";

    /** Authored string, retained without normalization of spelling. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    parameter_name = "";

    /** Authored member path, not a fetched resource. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    parameter_path = "";

    /** Authored resource reference; resolution never replaces this string. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.path
    path = "";

    /** Authored integer value. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.int32
    type = 0;

}
