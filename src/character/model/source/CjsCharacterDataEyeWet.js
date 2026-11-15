import { meta, type } from "#schema";

/**
 * Where a sex's generic head borrows its eye-wet effect from (`CjsCharacterDataSex.eyeWet`): the baked
 * character-select model whose matching area's effect is taken, and the generic head's eye-wet mesh. A workaround
 * held as data (`CjsCharacterLibraryManager.FetchEyeWet`).
 *
 * Ours (no Carbon counterpart): the client's paper doll is Python.
 */
@meta.define("CjsCharacterDataEyeWet")
export class CjsCharacterDataEyeWet
{

    /** The reference model's `res:` path. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    reference = "";

    /** The generic head's eye-wet mesh name. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    mesh = "";

}
