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

    /** The specular colour of a palette that tints nothing: mid grey, opaque. */
    static neutralSpecular = [ .5, .5, .5, 1 ];

    /** The shipped pattern textures; a palette's `pattern` names one (`caldari_C` is `caldari_c_z.dds`). */
    static patternRoot = "res:/graphics/character/patterns/";

    /**
     * A patterned palette's pattern, as patternblit takes it. `patternColors` holds patternblit's five
     * colours, then the placement and the rotation: the three pattern colours (the pattern texture's R, G
     * and B select them), then colour areas 2 and 3; the palette's own `colors` are what the item shows
     * without its pattern. That reading is ours, from the data: the third colour is set wherever the
     * pattern uses its B channel (31 of 31 shipped palettes), and the last two match the names (`stealth`
     * dark, `white` white, `blueorange` blue and orange) where `colors` do not (`stealth` area 2 is red).
     *
     * Ours (non-carbon-extensions.md § *The shared character library*): moved from Graphene's
     * `palettes.js` (`PatternOf`) with `CjsCharacterLibraryManager.FetchPalette`.
     *
     * @param {CjsCharacterColorVariation} value The palette.
     * @param {string} path The palette, for errors.
     * @returns {{ map: string, colors: Float32Array[], areas: Float32Array[], transform: Float32Array, rotation: number }}
     *   The pattern texture, its three colours, the colours of areas 2 and 3, its placement (offset x, y;
     *   repeat x, y) and its rotation in degrees.
     * @throws {Error} Unless the pattern colours, placement and rotation are well formed.
     */
    static patternOf(value, path)
    {
        const list = value.patternColors;
        if (!Array.isArray(list) || list.length !== 7) throw new Error("Malformed pattern colours " + path);
        const transform = list[5];
        const rotation = list[6];
        if (!Array.isArray(transform) || transform.length !== 4 || !transform.every(Number.isFinite) || !Number.isFinite(rotation))
            throw new Error("Malformed pattern placement " + path);
        return {
            map: CjsCharacterColorVariation.patternRoot + String(value.pattern).toLowerCase() + "_z.dds",
            colors: CjsCharacterColorVariation.colorTriple(list.slice(0, 3), path),
            areas: CjsCharacterColorVariation.colorTriple([ list[3], list[4], [ 0, 0, 0, 1 ] ], path).slice(0, 2),
            transform: Float32Array.from(transform),
            rotation
        };
    }

    /**
     * Three RGBA colours as Float32Arrays.
     *
     * Ours (non-carbon-extensions.md § *The shared character library*): moved from Graphene's
     * `palettes.js` (`ColorTriple`) with `CjsCharacterLibraryManager.FetchPalette`.
     *
     * @param {*} list The palette's colour list.
     * @param {string} path The palette, for the error.
     * @returns {Float32Array[]} The colours.
     * @throws {Error} Unless the list is three colours of four finite numbers.
     */
    static colorTriple(list, path)
    {
        if (!Array.isArray(list) || list.length !== 3 || list.some(color => !Array.isArray(color) || color.length !== 4 || !color.every(Number.isFinite)))
            throw new Error("Malformed palette " + path);
        return list.map(color => Float32Array.from(color));
    }

}
