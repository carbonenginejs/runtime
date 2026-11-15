import { meta, type } from "#schema";

/**
 * Which name rules give an archetype its bloodline and morph target (`CjsCharacterGeneric.bloodlines`). The rules
 * themselves are code the library names here (`CjsCharacterLibraryManager.FetchBloodline`); the shipped defaults are
 * `factory/defaults/bloodlines.json`, which says what each rule does. An empty value is the default's.
 *
 * Ours (no Carbon counterpart): Carbon's generic has no bloodlines, and the client's paper doll is Python.
 */
@meta.define("CjsCharacterDataBloodlines")
export class CjsCharacterDataBloodlines
{

    /** The rule that gives the bloodline from the head that depends on an archetype. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    rule = "";

    /** The rule that gives the morph target an archetype drives. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    morphTarget = "";

}
