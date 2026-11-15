import { meta, type } from "#schema";

/**
 * Base for one character library item: a record read from a file, or a join the parts library makes. `_pdpID` and
 * `_pdpType` travel with the item through its values, so a copy handed out can be matched back to its library item and
 * written in the shape it was read from. Both are read-only to callers: a reader or the part join sets `_pdpType`, and
 * the library sets `_pdpID` when it stores the item (the character factory also tags a recipe it reads, which the
 * library never stores).
 */
@meta.define("CjsCharacterRecord")
export class CjsCharacterRecord
{

    /**
     * The item's library ID: opaque outside the library; never parse it. It is the name the library stores the item
     * under (`CjsCharacterLibrary.AddKind`, which refuses an item another ID names): today its `res:` path (a part's
     * folder), or the name a caller stored it under. Were it to become a graphic ID, the library would keep the path
     * in a member of its own.
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
