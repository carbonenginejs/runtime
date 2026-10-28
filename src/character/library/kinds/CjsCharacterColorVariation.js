import { meta, type } from "#schema";

// Discovery: src/character/discovery/color.yaml
// Resource pattern: res:/graphics/character/*

/**
 * A colour variation with plain numeric tuples. Optional specularColors absence belongs to the reader/writer, not a fabricated authored value.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterColorVariation")
export class CjsCharacterColorVariation
{

    /** Three authored four-component tuples, without float32 rounding. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list({ kind: "list", itemType: "float64" })
    colors = [];

    /** Authored pattern name, retained as written. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.string
    pattern = "";

    /**
     * Seven positional values: six four-component tuples followed by one scalar. This is not a homogeneous
     * colour list.
     */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list("unknown")
    patternColors = [];

    /** Optional three four-component tuples. The reader/writer preserves whether the member was authored. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list({ kind: "list", itemType: "float64" })
    specularColors = [];

}
