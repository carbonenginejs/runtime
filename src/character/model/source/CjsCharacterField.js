import { meta, type } from "#schema";

// Discovery: src/character/discovery/trif.yaml
// Resource pattern: res:/graphics/character/global/facesetup/*

/**
 * One sculpt-field record retaining integer dictionary keys and tuple nesting.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterField")
export class CjsCharacterField
{

    /** Authored attribute names. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list("string")
    Attributes = [];

    /** Authored 3-component numeric tuple. Plain number storage avoids float32 rounding; source length is 3. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list("float64")
    MarkerPosition = [0, 0, 0];

    /** Integer triangle keys mapped to three integer vertex indices. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.map({ kind: "list", itemType: "int32" })
    Triangles = new Map();

    /**
     * Triangles of three vertex tuples; each vertex is [integer index, two-component UV tuple]. Preserve
     * mixed tuple slots.
     */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list({ kind: "list", itemType: { kind: "list", itemType: "unknown" } })
    Tris = [];

    /** Integer vertex keys mapped to lists of [string, scalar] pairs. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.map({ kind: "list", itemType: { kind: "list", itemType: "unknown" } })
    VertData = new Map();

    /** Integer vertex keys mapped to three-component numeric positions. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.map({ kind: "list", itemType: "float64" })
    VertPositions = new Map();

}
