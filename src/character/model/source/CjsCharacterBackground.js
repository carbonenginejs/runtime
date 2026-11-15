import { meta, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

// Discovery: src/character/discovery/backgrounds.yaml
// Additional discovery: scenes_background.yaml
// Resource pattern: res:/graphics/character/global/paperdolllibrary/backgrounds/*

/**
 * Portrait background configuration with the original resource spelling.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterBackground")
@meta.exposureChainTo(CjsCharacterRecord)
export class CjsCharacterBackground extends CjsCharacterRecord
{

    /** Authored numeric value, retained at JavaScript number precision. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    aspect_ratio = 0;

    /** Authored two-component offset tuple. Kept at the authored double precision. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.vec2d
    offset = new Float64Array(2);

    /** Authored resource reference; resolution never replaces this string. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.path("TriTextureRes")
    path = "";

    /** Authored numeric value, retained at JavaScript number precision. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    scale = 0;

}
