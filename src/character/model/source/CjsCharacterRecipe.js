import { meta, type } from "#schema";

// Discovery: src/character/discovery/prs.yaml
// Discovery: src/character/discovery/scenes_prs.yaml
// Resource pattern: res:/graphics/character/*

/**
 * A recipe sequence retaining its leading sex string when present and ordered modifier records.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterRecipe")
export class CjsCharacterRecipe
{

    /** Library identity for this unnamed root; not a key added to the original file. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /**
     * Mixed source sequence: optional leading string and CjsCharacterRecipeModifier records. The reader
     * supplies record instances; the writer retains source layout.
     */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list("unknown")
    value = [];

}
