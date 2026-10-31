import { meta, type } from "#schema";

// Discovery: src/character/discovery/scenes_post.yaml
// Resource pattern: res:/animation_gstate/scenes/*

/**
 * The scalar post variant: string lut and scalar lut_influence, kept apart from vector posts.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterScalarPost")
export class CjsCharacterScalarPost
{

    /** Authored string; not coerced to a boolean. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    lut = "";

    /** Authored scalar; not expanded to a four-component tuple. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    lut_influence = 0;

    /** Authored resource reference; resolution never replaces this string. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.path("TriTextureRes")
    lut_path = "";

}
