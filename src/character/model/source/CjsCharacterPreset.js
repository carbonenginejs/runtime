import { meta, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

// Discovery: src/character/discovery/characters.yaml
// Resource pattern: res:/graphics/character/global/paperdolllibrary/characters/*

/**
 * A character preset, distinct from the records held by scene.characters.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterPreset")
@meta.exposureChainTo(CjsCharacterRecord)
export class CjsCharacterPreset extends CjsCharacterRecord
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

    /** The preset's rotation quaternion, at the authored double precision. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.vec4d
    rotation = new Float64Array(4);

    /** The preset's translation, at the authored double precision. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.vec3d
    translation = new Float64Array(3);

}
