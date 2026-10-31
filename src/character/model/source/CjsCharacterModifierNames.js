import { meta, type } from "#schema";

// Discovery: src/character/discovery/modifiernames.yaml
// Resource pattern: res:/graphics/character/*

/**
 * A scalar modifier-name source. The original value is not split into a list.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterModifierNames")
export class CjsCharacterModifierNames
{

    /** Library identity for this unnamed root; not a key added to the original file. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /** Complete authored scalar string. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    value = "";

}
