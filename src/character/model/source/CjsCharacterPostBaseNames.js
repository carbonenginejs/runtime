import { meta, type } from "#schema";

// Discovery: src/character/discovery/basename.yaml
// Resource pattern: res:/graphics/character/global/paperdolllibrary/posts/*

/**
 * A scalar post base-name source. The original value is not split into a list.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterPostBaseNames")
export class CjsCharacterPostBaseNames
{

    /** Library identity for this unnamed root; not a key added to the original file. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /** Complete authored scalar string. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.string
    value = "";

}
