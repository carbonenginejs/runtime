import { meta, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

// Discovery: src/character/discovery/type.yaml
// Resource pattern: res:/graphics/character/*

/**
 * A part type: the part folder, variation and colour variant an option presets, and the bloodlines it names. The file
 * is one tuple of three or four items; the reader (`CjsCharacterLibraryConfiguration.kinds.types.slots`) names them.
 * The field names are the former catalog record's (CjsCharacterPartType), except slot 1: the parts library compares it
 * with a recipe entry's `variation` (`CjsCharacterLibraryManager.ResolveRecipeEntry`).
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterType")
@meta.exposureChainTo(CjsCharacterRecord)
export class CjsCharacterType extends CjsCharacterRecord
{

    /** Library identity for this unnamed root; not a key added to the original file. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /**
     * The part folder below the sex's paper doll root (slot 0), as written: seven tattoo types name it in mixed case.
     */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    partPath = "";

    /** The variation folder (`v0`, `v1`...; slot 1), or "" for the part's own folder. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    variation = "";

    /** The `.color` in the part folder this type presets (slot 2, its file stem as written), or "" for none. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    colorVariant = "";

    /**
     * Bloodline ids (slot 3; 217 of build 3646012's 2,296 types have it, empty or nine long). The nine are every player
     * bloodline outside Minmatar (1, 2, 5, 6, 7, 8, 11, 12, 13: ESI /universe/bloodlines). Whether they allow or
     * exclude is not stated.
     */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.int32Array
    bloodlineIDs = new Int32Array(0); // alloc: field default, one per record

}
