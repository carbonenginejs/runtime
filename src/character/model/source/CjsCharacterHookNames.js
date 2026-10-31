import { meta, type } from "#schema";

// Discovery: src/character/discovery/cameras.yaml
// Resource pattern: res:/graphics/character/global/paperdolllibrary/cameras/*

/**
 * The authored hook_names record in a keyed camera.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterHookNames")
export class CjsCharacterHookNames
{

    /** Authored string, retained without normalization of spelling. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.string
    fov = "";

    /** Authored string, retained without normalization of spelling. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /** Authored string, retained without normalization of spelling. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.string
    target = "";

    /** Authored string, retained without normalization of spelling. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.string
    transform = "";

    /** Authored string, retained without normalization of spelling. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.string
    translation = "";

}
