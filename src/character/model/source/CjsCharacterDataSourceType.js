import { meta, type } from "#schema";
import { CjsCharacterPdpType } from "../../formats/characterPdpType.js";

/**
 * One source type of the character library (`CjsCharacterGeneric.sourceTypes`): the record class its files read into,
 * the file shape it stores (`CjsCharacterRecord._pdpType`), and how the reader lays a file onto the record.
 *
 * Ours (no Carbon counterpart): the client's paper doll is Python.
 */
@meta.define("CjsCharacterDataSourceType")
export class CjsCharacterDataSourceType
{

    /** The source type's name (`cameras`); the library's list of its records has this name. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /** The record class its files read into (`CjsCharacterCamera`). */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    className = "";

    /** The file shape the reader sets on each record. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.enum(CjsCharacterPdpType)
    @type.uint32
    pdpType = 0;

    /** Whether the file is the record's `value` (an envelope: the record's `name` is its path). */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.boolean
    envelope = false;

    /** Whether its records are the generic's, not the library's own lists. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.boolean
    generic = false;

    /** For an envelope file that is one tuple: the fields its items fill, in order. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string.array()
    slots = [];

    /** Whether its files are only indexed by path, never read. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.boolean
    pathOnly = false;

    /** Whether its records are made by the library (a part join), not read from a file. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.boolean
    derived = false;

}
