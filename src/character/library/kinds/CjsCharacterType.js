import { meta, type } from "#schema";

// Discovery: src/character/discovery/type.yaml
// Resource pattern: res:/graphics/character/*

/**
 * A three- or four-slot Python tuple, with no invented slot names.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterType")
export class CjsCharacterType
{

    /** Library identity for this unnamed root; not a key added to the original file. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /**
     * Raw slots: three strings followed optionally by an integer list. Slot 2 names a .color in the
     * referenced part folder; preserve its spelling.
     */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list("unknown")
    value = [];

}
