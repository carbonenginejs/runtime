import { meta, type } from "#schema";

// Discovery: src/character/discovery/info.yaml
// Resource pattern: res:/graphics/character/*

/**
 * Authored material attributes; each value is a one-element list containing a three-component tuple.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterAttributes")
export class CjsCharacterAttributes
{

    /** Authored one-element list of a vec3 tuple. Numeric precision and nesting are retained. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list({ kind: "list", itemType: "float64" })
    ambientColor = [];

    /** Authored one-element list of a vec3 tuple. Numeric precision and nesting are retained. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list({ kind: "list", itemType: "float64" })
    color = [];

    /** Authored one-element list of a vec3 tuple. Numeric precision and nesting are retained. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list({ kind: "list", itemType: "float64" })
    incandescence = [];

    /** Authored one-element list of a vec3 tuple. Numeric precision and nesting are retained. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list({ kind: "list", itemType: "float64" })
    transparency = [];

}
