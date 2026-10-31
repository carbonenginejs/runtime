import { meta, type } from "#schema";

// Discovery: src/character/discovery/blendshapes.yaml
// Resource pattern: res:/graphics/character/unique/characterselect/*

/**
 * Named blend-shape weights from one source file.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterBlendShapes")
export class CjsCharacterBlendShapes
{

    /** Library identity for this unnamed root; not a key added to the original file. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /** Authored identifier keys and weights. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.map("float64")
    value = new Map();

}
