import { meta, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

// Discovery: src/character/discovery/posts.yaml
// Additional discovery: scenes_post.yaml
// Resource pattern: res:/graphics/character/global/paperdolllibrary/posts/*

/**
 * A post's LUT settings. Files write it in two layouts; the scalar one (`lut: ''`, `lut_influence: 0`) is always the
 * empty post, and the reader reads it into these fields (`CjsCharacterObjectBuilder`, `ReadScalarPost`). Its
 * `_pdpType` keeps the layout it was read from.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterPost")
@meta.exposureChainTo(CjsCharacterRecord)
export class CjsCharacterPost extends CjsCharacterRecord
{

    /** Authored boolean value. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.boolean
    lut = false;

    /** Authored 4-component numeric tuple. Kept at the authored double precision. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.vec4d
    lut_influence = new Float64Array(4);

    /** Authored resource reference; resolution never replaces this string. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.path("TriTextureRes")
    lut_path = "";

    /** Optional authored boolean in scene posts. The reader/writer preserves its absence. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.boolean
    transmission_noise = false;

}
