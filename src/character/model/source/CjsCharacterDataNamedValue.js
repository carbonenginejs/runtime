import { meta, type } from "#schema";

/**
 * One named string of the character library's data: Carbon's lists hold objects and it has no map of plain values, so
 * an open-ended set of name-to-string entries is a list of these, keyed by `name` (a name may repeat where the set
 * holds several strings for it, in order).
 *
 * Ours (no Carbon counterpart): the client's paper doll is Python.
 */
@meta.define("CjsCharacterDataNamedValue")
export class CjsCharacterDataNamedValue
{

    /** The entry's name. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /** Its string. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    value = "";

}
