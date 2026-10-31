import { meta, type } from "#schema";
import { vec4 } from "#math/vec4";

// Discovery: src/character/discovery/color.yaml
// Resource pattern: res:/graphics/character/*

/**
 * A colour variation: three colours, three specular colours and an optional pattern. Each colour is its own
 * field, as Carbon exposes `EveSOFDataFactionColorSet` colour by colour; the file's `colors` and
 * `specularColors` lists are translated by the reader (`sourceLists`).
 */
@meta.define("CjsCharacterColorVariation")
export class CjsCharacterColorVariation
{

    /** Colour area 1's RGBA colour (the file's `colors[0]`). */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.color
    color1 = vec4.create();

    /** Colour area 2's RGBA colour (the file's `colors[1]`). */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.color
    color2 = vec4.create();

    /** Colour area 3's RGBA colour (the file's `colors[2]`). */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.color
    color3 = vec4.create();

    /** Authored pattern name, retained as written. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    pattern = "";

    /**
     * Seven positional values: six four-component tuples followed by one scalar. This is not a homogeneous
     * colour list.
     */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("unknown")
    patternColors = [];

    /** Colour area 1's specular colour (the file's `specularColors[0]`); neutral grey when the file has none. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.color
    specularColor1 = vec4.fromValues(.5, .5, .5, 1);

    /** Colour area 2's specular colour (the file's `specularColors[1]`); neutral grey when the file has none. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.color
    specularColor2 = vec4.fromValues(.5, .5, .5, 1);

    /** Colour area 3's specular colour (the file's `specularColors[2]`); neutral grey when the file has none. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.color
    specularColor3 = vec4.fromValues(.5, .5, .5, 1);

    /**
     * The files' list form, translated by the reader: each listed key holds one tuple per named field, copied
     * into that field in order.
     */
    static sourceLists = {
        colors: [ "color1", "color2", "color3" ],
        specularColors: [ "specularColor1", "specularColor2", "specularColor3" ]
    };

    /**
     * The specular colour of a palette that tints nothing: mid grey, opaque. 229 of build 3662168's 2,555
     * palettes state no specular colours, and their records hold this (2026-11-01, colour reshape): before it, a
     * palette without them could not be read with its specular colours.
     */
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
