import { meta, type } from "#schema";

/**
 * Base for one character library item: a record read from a file, or a join the parts library makes. `_pdpID` and
 * `_pdpType` travel with the item through its values, so a copy handed out can be matched back to its library item and
 * written in the shape it was read from. Both are read-only: a reader or the library sets them
 * through values.
 */
@meta.define("CjsCharacterRecord")
export class CjsCharacterRecord
{

    /**
     * The item's library ID: opaque; never parse it. Today it is the item's `res:` path (a generated ID for an item
     * that is no file); later a graphic ID. The library assigns it when it stores the item, if missing.
     */
    @meta.mapAttribute(meta.READ | meta.PERSIST)
    @type.string
    _pdpID = "";

    /**
     * The file shape the reader read the item from (`CjsCharacterPdpType`; `NONE` for an item no reader made).
     */
    @meta.mapAttribute(meta.READ | meta.PERSIST)
    @type.uint32
    _pdpType = 0;

}
