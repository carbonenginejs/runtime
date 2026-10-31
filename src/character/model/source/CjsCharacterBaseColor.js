import { meta, type } from "#schema";

// Discovery: src/character/discovery/base.yaml
// Resource pattern: res:/graphics/character/*

/**
 * One root four-component colour tuple in a named envelope.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterBaseColor")
export class CjsCharacterBaseColor
{

    /** Library identity for this unnamed root; not a key added to the original file. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /** Authored 4-component numeric tuple. Plain number storage avoids float32 rounding; source length is 4. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list("float64")
    value = [0, 0, 0, 0];

}
