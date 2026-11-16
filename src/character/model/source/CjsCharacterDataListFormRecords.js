import { meta, type } from "#schema";
import { CjsCharacterDataListForm } from "./CjsCharacterDataListForm.js";
import "./CjsCharacterDataTupleShape.js";

/**
 * A list form whose file key becomes a list of records (`ReadRecordList`): with `keyed` the file holds a mapping and
 * each key fills that field; without it the file holds a list. Each value fills its record by `tuple` (fields by
 * position) or `tupleByLength` (fields by the tuple's length, `rest` taking the trailing items), else whole into the
 * `value` field, else, a mapping, field by field.
 *
 * Ours (no Carbon counterpart): the client's paper doll is Python.
 */
@meta.define("CjsCharacterDataListFormRecords")
@meta.exposureChainTo(CjsCharacterDataListForm)
export class CjsCharacterDataListFormRecords extends CjsCharacterDataListForm
{

    /** The field a mapping's key fills, or "" for a file that holds a list. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    keyed = "";

    /** The field a whole value fills, or "" for none. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    value = "";

    /** The fields a tuple value fills by position, or none. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string.array()
    tuple = [];

    /** The fields a tuple value fills by its length, where the file mixes shapes, or none. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.object.embed.array("CjsCharacterDataTupleShape")
    tupleByLength = [];

    /** The field the trailing items of a tuple fill as one list, or "" for none. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    rest = "";

}
