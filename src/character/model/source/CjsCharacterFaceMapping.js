import { meta, type } from "#schema";

// Discovery: src/character/discovery/face.yaml
// Resource pattern: res:/graphics/character/global/facesetup/*

/**
 * Named heterogeneous face-mapping tuples, retaining their positional structure.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterFaceMapping")
export class CjsCharacterFaceMapping
{

    /** Library identity for this unnamed root; not a key added to the original file. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /** Authored keys and four- or seven-slot tuples containing strings, integers and scalar values. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.map({ kind: "list", itemType: "unknown" })
    value = new Map();

}
