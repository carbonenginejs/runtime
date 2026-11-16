import { meta, type } from "#schema";

/**
 * One path rule of the character library's indexing (`CjsCharacterGeneric.sourceRows`): the files a `res:` pattern
 * matches are of a source type (`CjsCharacterDataSourceType`). Plain `.yaml` files carry nothing that says what they
 * are, so their folder and name do.
 *
 * Ours (no Carbon counterpart): the client's paper doll is Python.
 */
@meta.define("CjsCharacterDataSourceRow")
export class CjsCharacterDataSourceRow
{

    /** The `res:` pattern (`*` within a folder, `**` across folders). */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    match = "";

    /** The source type the matched files are (`cameras`, `poses`). */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    sourceType = "";

}
