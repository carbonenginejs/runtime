import { meta, type } from "#schema";
import { CjsCharacterDataListForm } from "./CjsCharacterDataListForm.js";

/**
 * A list form whose file key holds one tuple or number per named field, in order (a palette's `colors`: `color1`,
 * `color2`, `color3`).
 *
 * Ours (no Carbon counterpart): the client's paper doll is Python.
 */
@meta.define("CjsCharacterDataListFormPositional")
@meta.exposureChainTo(CjsCharacterDataListForm)
export class CjsCharacterDataListFormPositional extends CjsCharacterDataListForm
{

    /** The fields the list's items fill, in order. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string.array()
    fields = [];

}
