import { meta, type } from "#schema";

/**
 * The fields one tuple length fills, where a file mixes tuple shapes under one key (a face mapping's four- and
 * seven-slot tuples; `CjsCharacterDataListFormRecords.tupleByLength`).
 *
 * Ours (no Carbon counterpart): the client's paper doll is Python.
 */
@meta.define("CjsCharacterDataTupleShape")
export class CjsCharacterDataTupleShape
{

    /** The tuple's length. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.uint32
    length = 0;

    /** The fields its leading items fill, in order. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string.array()
    fields = [];

}
