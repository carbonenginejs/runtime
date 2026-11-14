// Source: blueexposure/include/BlueTypes.h:321-375 (Be::VarEntry)
import { EDITFLAGS, VARTYPE } from "../../consts/blue.js";

/**
 * What an IROOT member is. Carbon casts the destination to find out; a plain
 * record, and plain JavaScript storage, cannot be cast.
 *
 * @enum {number}
 */
export const BLACK_DESTINATION = Object.freeze({
  OBJECT: 0,
  LIST: 1,
  ARRAY: 2,
  SET: 3,
  DICT: 4,
  STRUCTURELIST: 5,
  WRAPPER: 6
});

/**
 * One row of a class's member table: Carbon's `Be::VarEntry`, which
 * `MAP_ATTRIBUTE` and `MAP_PROPERTY*` push into the table `EXPOSURE_BEGIN`
 * starts (BlueExposureMacrosPython.h:35). Filled once per class by the
 * schema's compile at registration (`compileClassInfo`).
 *
 * Adapted: Carbon's `mOffset` and `mSize` locate the member's bytes in the
 * object; a JavaScript member is located by its property key, so `key` stands
 * in for both. Carbon's table holds only Blue rows; ours also holds the rows
 * our own classes declare with `meta.map*`, and `meta.blue` says which a row is
 * (`be` is `meta` plus Blue, decorator-upgrade.md § 6.8).
 *
 * Ours, on the same row: what Carbon reads from the C++ member type and a
 * JavaScript property cannot say - the element index, the sign, the float
 * count, what an IROOT member is, and the classes it accepts. The readers read
 * them here; names the compile cannot resolve yet resolve on first read. And what
 * the graph's value operations and walks need: the type name, its handler, and
 * how the member holds another object. A row belongs to one class; every table
 * built from rows lists the same objects.
 *
 * Carbon: Be::VarEntry (blueexposure/include/BlueTypes.h:321-375)
 *
 * @adapted `key` stands in for `mOffset` and `mSize`, and the table also carries our own `meta.map*` rows, flagged by `meta.blue`.
 */
export class VarEntry
{

  /**
   * `mName`: the exposed name.
   *
   * @implemented
   */
  name = "";

  /**
   * `mType`: the member's VARTYPE, from its declared type; INVALID for a type with none.
   *
   * @implemented
   */
  type = VARTYPE.INVALID;

  /**
   * The member's JavaScript key.
   *
   * @cjs Stands in for mOffset: a JavaScript member is found by its key, not a byte offset.
   */
  key = "";

  /**
   * JavaScript-specific member metadata. `blue` marks rows exposed to Blue rather than
   * only our own metadata consumers. Each entry owns its metadata object.
   *
   * @cjs
   * @implemented
   */
  meta = { blue: false };

  /**
   * `mIID`: the interface or class a reference member holds, by registered name, or null.
   *
   * @implemented
   */
  iid = null;

  /**
   * `mDescription`: Carbon's doc string. Ours live in JSDoc, so it is empty unless an editor annotation gives one.
   *
   * @implemented
   */
  description = "";

  /**
   * `mEditFlags`: `Be::EDITFLAGS` bits.
   *
   * @implemented
   */
  editFlags = 0;

  /**
   * The element of an array member this row names, or -1 for the whole member.
   *
   * @cjs Carbon's row is a byte offset, so an element is just another offset.
   */
  index = -1;

  /**
   * Whether an integer member is signed.
   *
   * @cjs Carbon reads the sign from the C++ member type (IRootReader.cpp:130-138).
   */
  signed = false;

  /**
   * A FLOATARRAY member's element count.
   *
   * @cjs Carbon's GetFloatArraySize() divides mSize (BlueTypes.h:339-349); a JavaScript member has no byte size.
   */
  floatArraySize = 0;

  /**
   * What an IROOT member is (see `BLACK_DESTINATION`).
   *
   * @cjs Carbon casts the live member to IList, IBlueDict or IBlueStructureList (IRootReader.cpp:160-187).
   */
  destination = BLACK_DESTINATION.OBJECT;

  /**
   * Whether a null item stays in the member's collection.
   *
   * @cjs Ours only: Carbon always drops a null list item (BlackReader.cpp:497-502).
   */
  keepsNulls = false;

  /**
   * The Blue math wrapper class a wrapped member is read through, or null.
   *
   * @cjs Carbon's member is a real TriMatrix or TriVector read through its own ClassInfo (IRootReader.cpp:183).
   */
  wrapperClass = null;

  /**
   * A wrapped member's declared kind, which picks the wrapper's layout, or null.
   *
   * @cjs
   */
  wrapperKind = null;

  /**
   * The classes an object member accepts, as declared: classes or registered names.
   *
   * @cjs Carbon's row has one mIID; ours may accept several.
   */
  accepts = [];

  /**
   * A structure list's item class, or its registered name, or null.
   *
   * @cjs Carbon's list object answers GetStructureDefinition() itself (BlackReader.cpp:546).
   */
  structClass = null;

  /**
   * Whether the row is an attribute or a property.
   *
   * @cjs
   */
  role = "attribute";

  /**
   * The member's type name, a key of GRAPH_TYPES ("float32", "vec3", "rootRef").
   *
   * @cjs Carbon has the C++ member type; `type` above is the VARTYPE it stores as.
   */
  kind = "invalid";

  /**
   * The graph handler for the member's storage kind, or null on a row no value operation reads.
   *
   * @cjs
   */
  handler = null;

  /** Whether a value operation may assign the value with no handler call. @cjs */
  direct = false;

  /** An array member's element count, 0 for any length. @cjs */
  length = 0;

  /** An integer member's width in bits. @cjs */
  bits = 0;

  /** The typed-array class an array member stores, or null. @cjs */
  ctor = null;

  /** A check a value must pass, or null. @cjs */
  check = null;

  /** The compiled type of a values list's items, or null. @cjs */
  item = null;

  /**
   * The member's Be::EDITFLAGS with ours merged in, and the graph's own bits (GraphMemberFlags).
   *
   * @cjs `editFlags` above keeps what Carbon's macro wrote.
   */
  flags = 0;

  /** The GRAPH_WRAPPERS record a wrapped member is written through, or null. @cjs */
  wrapped = null;

  /** Anything rare the member's definition carries, or null. @cjs */
  options = null;

  /** How the member holds another object: "embed", "ref", "refWeak", "weak", or null for a value. @cjs */
  edgeKind = null;

  /** The class names an object member may hold, the declared one first; empty means any. @cjs */
  edgeType = null;

  /** The collection an object member is: "list", "array", "set", "map", or null. @cjs */
  collection = null;

  /** The class record that declares this row. @cjs */
  owner = null;

  /** The resolved accepted classes, once every name has resolved. */
  _iids = null;

  /** The structure layout, once asked for. */
  _structure = undefined;

  /**
   * The compile's class lookup by registered name, or null before the schema loads.
   *
   * @type {((name: string) => Function|null)|null}
   */
  static classResolver = null;

  /**
   * The compile's structure-list layout for an item class, or null before the schema loads.
   *
   * @type {((item: string|Function) => object)|null}
   */
  static structureResolver = null;

  /**
   * Whether `mEditFlags` has NOTIFY.
   *
   * @cjs
   * @returns {boolean} True when it has.
   */
  get notify()
  {
    return (this.editFlags & EDITFLAGS.NOTIFY) !== 0;
  }

  /**
   * Whether an accessor takes the value.
   *
   * @cjs
   * @returns {boolean} True when the row has a getter or a setter.
   */
  get isProperty()
  {
    return this.getProperty !== null || this.setProperty !== null;
  }

  /**
   * The accepted classes that are registered; empty means any object. Kept once
   * every declared name has resolved, so a class registered later still counts.
   *
   * @cjs
   * @returns {Function[]} The classes.
   */
  get iids()
  {
    if (this._iids !== null) return this._iids;
    const found = [];
    let complete = true;
    for (const accepted of this.accepts)
    {
      const Class = typeof accepted === "function" ? accepted : VarEntry.classResolver(accepted);
      if (Class) found.push(Class);
      else complete = false;
    }
    if (complete) this._iids = found;
    return found;
  }

  /**
   * A structure list's layout: the item class's `meta.struct` record, each
   * field as an entry the handlers read as a member, or null.
   *
   * @cjs
   * @returns {{size: number, boundaries: number[], Item: Function, fields: object[], definition: object}|null} The layout.
   * @throws {TypeError} When the item class is unregistered or declares no structure.
   */
  get structure()
  {
    if (this._structure !== undefined) return this._structure;
    this._structure = this.structClass ? VarEntry.structureResolver(this.structClass) : null;
    return this._structure;
  }

  /**
   * `mChooserTable`: `[name, value, description]` rows, or null. A chooser that
   * names its enum is resolved on first read: the enum may register after the class.
   *
   * @implemented
   * @returns {Array<Array<*>>|null} The rows.
   */
  get chooserTable()
  {
    if (this._chooserSource !== null)
    {
      const { entries, enumType, required } = this._chooserSource;
      const resolved = entries ?? (enumType === null ? null : VarEntry.chooserResolver(enumType, required));
      this._chooserTable = resolved ? resolved.map(item => [ item.name, item.value, item.description || "" ]) : null;
      this._chooserSource = null;
    }
    return this._chooserTable;
  }

  set chooserTable(rows)
  {
    this._chooserTable = rows;
    this._chooserSource = null;
  }

  /**
   * Ours: the rows, once resolved.
   *
   * @cjs
   * @type {Array<Array<*>>|null}
   */
  _chooserTable = null;

  /**
   * Ours: where the rows come from until first read: given entries, or an enum by name.
   *
   * @cjs
   * @type {{entries: (object[]|null), enumType: (string|null), required: boolean}|null}
   */
  _chooserSource = null;

  /**
   * Ours: records where `chooserTable` comes from, resolved on its first read.
   *
   * @cjs
   * @param {object[]|null} entries The chooser's `{ name, value, description }` entries, when declared inline.
   * @param {string|null} enumType Otherwise the registered enum that supplies them.
   * @param {boolean} required Whether that enum must register a chooser.
   */
  setChooserSource(entries, enumType, required)
  {
    this._chooserSource = { entries, enumType, required };
  }

  /**
   * Ours: the schema's lookup of an enum's chooser entries by name. Null until the schema loads.
   *
   * @cjs
   * @type {((enumType: string, required: boolean) => (object[]|null))|null}
   */
  static chooserResolver = null;

  /**
   * `mGetProperty`: the property's getter, or null for an attribute.
   *
   * @implemented
   */
  getProperty = null;

  /**
   * `mSetProperty`: the property's setter, or null for an attribute or a read-only property.
   *
   * @implemented
   */
  setProperty = null;

  /**
   * Ours: the registered name, which minification cannot change.
   *
   * @cjs
   * @implemented
   */
  static className = "VarEntry";

}
