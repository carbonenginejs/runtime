import { meta, type } from "#schema";

// Discovery: src/character/discovery/backgrounds.yaml
// Additional discovery: scenes_background.yaml
// Resource pattern: res:/graphics/character/global/paperdolllibrary/backgrounds/*

/**
 * Portrait background configuration with the original resource spelling.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterBackground")
export class CjsCharacterBackground
{

    /** Authored numeric value, retained at JavaScript number precision. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    aspect_ratio = 0;

    /** Authored two-component offset tuple. Plain number storage avoids float32 rounding; source length is 2. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list("float64")
    offset = [0, 0];

    /** Authored resource reference; resolution never replaces this string. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.path("TriTextureRes")
    path = "";

    /** Authored numeric value, retained at JavaScript number precision. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    scale = 0;

}
