import { meta, type } from "#schema";

// Discovery: src/character/discovery/characters.yaml
// Resource pattern: res:/graphics/character/global/paperdolllibrary/characters/*

/**
 * A character preset, distinct from the records held by scene.characters.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterPreset")
export class CjsCharacterPreset
{

    /** Authored animation string; observed presets contain the literal placeholder PATH. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    animation = "";

    /** Authored string, retained without normalization of spelling. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    gender = "";

    /** Authored string, retained without normalization of spelling. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /** Authored resource reference; resolution never replaces this string. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.path(".prs")
    path = "";

    /** Authored 4-component numeric tuple. Plain number storage avoids float32 rounding; source length is 4. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("float64")
    rotation = [0, 0, 0, 0];

    /** Authored 3-component numeric tuple. Plain number storage avoids float32 rounding; source length is 3. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("float64")
    translation = [0, 0, 0];

}
