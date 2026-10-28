import { meta, type } from "#schema";

// Discovery: src/character/discovery/posts.yaml
// Additional discovery: scenes_post.yaml
// Resource pattern: res:/graphics/character/global/paperdolllibrary/posts/*

/**
 * The vector post variant, separate from scalar post settings.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterPost")
export class CjsCharacterPost
{

    /** Authored boolean value. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.boolean
    lut = false;

    /** Authored 4-component numeric tuple. Plain number storage avoids float32 rounding; source length is 4. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list("float64")
    lut_influence = [0, 0, 0, 0];

    /** Authored resource reference; resolution never replaces this string. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.path("TriTextureRes")
    lut_path = "";

    /** Optional authored boolean in scene posts. The reader/writer preserves its absence. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.boolean
    transmission_noise = false;

}
