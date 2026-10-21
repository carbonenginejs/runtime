// Source: blue/include/BlueObjectMetadata.h
// Source: blue/src/BlueObjectMetadata.cpp
//
// The object-metadata store: string keys to string values per object, held
// BESIDE the object, never on it. Carbon keeps one static table
// (`s_beObjectMetadata`, BlueObjectMetadata.cpp:8) keyed by the owner through
// a weak reference (`m_metadata`, BlueObjectMetadata.h:38). Readers put a
// bag's `__bluemetadata__` dictionary into it (DictReader.cpp:185-188,
// YamlReader.cpp:1359-1361) and writers read it back out
// (YamlWriter.cpp:329-341).
//
// `BeObjectMetadata` is the process-wide instance (BlueObjectMetadata.cpp:8-9).
import { CjsSchema, meta, blue } from "#schema";
import { IBlueObjectMetadata } from "./IBlueObjectMetadata.js";

/** `BlueStdResult` codes the store answers with (`BLUE_STD_RESULT_OK`, `BLUE_STD_RESULT_KEY_ERROR`). */
const OK = { ok: true, message: "" };
const KeyError = message => ({ ok: false, message });


/** `BlueObjectMetadata` - the object-metadata store. */
export class BlueObjectMetadata extends IBlueObjectMetadata
{
  /**
   * `m_metadata` (BlueObjectMetadata.h:38): each owner's table, keyed weakly
   * by the owner. Carbon registers itself as a weak-reference observer on
   * insert (:51) and drops the table in `WeakRefNotify` when the owner dies
   * (:151-154); a WeakMap key releases its entry with the owner, so no
   * register or unregister step exists here.
   *
   * @type {WeakMap<object, Object<string, string>>}
   */
  _metadata = new WeakMap();

  /**
   * The object's table (BlueObjectMetadata.cpp:30-38).
   *
   * @param {object} owner The object.
   * @returns {Object<string, string>|null} The table, or null when it has none.
   */
  GetMetadata(owner)
  {
    if (!owner || typeof owner !== "object") return null;
    return this._metadata.get(owner) ?? null;
  }

  /**
   * Sets one key (:40-54). Keys and values are strings, as Carbon's are.
   *
   * @param {object} owner The object.
   * @param {string} key The key.
   * @param {string} value The value.
   */
  Set(owner, key, value)
  {
    if (!owner) return;

    let table = this._metadata.get(owner);
    if (!table)
    {
      // Carbon's `DataTable::mapping` is a string map; a null-prototype
      // dictionary holds any key, `__proto__` included, as data.
      table = Object.create(null);
      this._metadata.set(owner, table);
    }
    table[String(key)] = String(value);
  }

  /**
   * One key's value (:56-69).
   *
   * @returns {string|*} The value, or `defaultValue`.
   */
  Get(owner, key, defaultValue = null)
  {
    const table = this.GetMetadata(owner);
    return table && Object.hasOwn(table, key) ? table[key] : defaultValue;
  }

  /**
   * Removes one key, and the object's table once it is empty (:71-89).
   *
   * @returns {{ok: boolean, message: string}} Carbon's `BlueStdResult`.
   */
  Delete(owner, key)
  {
    const table = this.GetMetadata(owner);
    if (!table) return KeyError("object not found in the database");
    if (!Object.hasOwn(table, key)) return KeyError("key not found in the database");

    delete table[key];
    if (!Object.keys(table).length) this._metadata.delete(owner);
    return OK;
  }

  /**
   * Removes the object's table (:91-102).
   *
   * @returns {{ok: boolean, message: string}} Carbon's `BlueStdResult`.
   */
  DeleteObject(owner)
  {
    if (!this.GetMetadata(owner)) return KeyError("object not found in the database");
    this._metadata.delete(owner);
    return OK;
  }

  /**
   * One key's value (:104-119).
   *
   * @returns {{result: {ok: boolean, message: string}, value: string|null}} Carbon's out argument comes back here.
   */
  Index(owner, key)
  {
    const table = this.GetMetadata(owner);
    if (!table) return { result: KeyError("object not found in the database"), value: null };
    if (!Object.hasOwn(table, key)) return { result: KeyError("key not found in the database"), value: null };
    return { result: OK, value: table[key] };
  }

  /**
   * The object's keys (:121-136).
   *
   * @returns {{result: {ok: boolean, message: string}, keys: string[]}} Carbon's out argument comes back here.
   */
  GetKeys(owner)
  {
    const table = this.GetMetadata(owner);
    return table ? { result: OK, keys: Object.keys(table) } : { result: KeyError("object not found in the database"), keys: [] };
  }

  /**
   * A copy of the object's key/value pairs (:138-149).
   *
   * @returns {{result: {ok: boolean, message: string}, items: Object<string, string>}} Carbon's out argument comes back here.
   */
  GetItems(owner)
  {
    const table = this.GetMetadata(owner);
    const items = Object.create(null);
    if (!table) return { result: KeyError("object not found in the database"), items };

    Object.assign(items, table);
    return { result: OK, items };
  }

  /**
   * Copies the source object's keys onto the target (:156-168).
   *
   * @returns {{ok: boolean, message: string}} Carbon's `BlueStdResult`.
   */
  CopyShallow(source, target)
  {
    for (const key of this.GetKeys(source).keys) this.Set(target, key, this.Get(source, key));
    return OK;
  }

  /**
   * Copies metadata across every object the source reaches (:170-217).
   * Carbon finds the source's IRoot interfaces by member walk (`FindInterface`);
   * nothing here needs it yet.
   */
  CopyDeep(_source, _target)
  {
    throw new Error("BlueObjectMetadata.CopyDeep is not implemented in CarbonEngineJS.");
  }
}

/** `BeObjectMetadata` - the process-wide object-metadata store. */
export const BeObjectMetadata = new BlueObjectMetadata();

CjsSchema.exposure.mapInterface(IBlueObjectMetadata)(BlueObjectMetadata);
CjsSchema.exposure.define("BlueObjectMetadata")(BlueObjectMetadata);
CjsSchema.decorateMethod(BlueObjectMetadata, "GetMetadata", blue.method, meta.adapted);
CjsSchema.decorateMethod(BlueObjectMetadata, "Set", blue.method, meta.adapted);
CjsSchema.decorateMethod(BlueObjectMetadata, "GetKeys", blue.method, meta.adapted);
CjsSchema.decorateMethod(BlueObjectMetadata, "Delete", blue.method, meta.adapted);
CjsSchema.decorateMethod(BlueObjectMetadata, "DeleteObject", blue.method, meta.adapted);
CjsSchema.decorateMethod(BlueObjectMetadata, "CopyDeep", blue.method, meta.notImplemented);
CjsSchema.decorateMethod(BlueObjectMetadata, "Get", blue.method, meta.adapted);
CjsSchema.decorateMethod(BlueObjectMetadata, "CopyShallow", blue.method, meta.adapted);
CjsSchema.decorateMethod(BlueObjectMetadata, "Index", blue.method, meta.adapted);
CjsSchema.decorateMethod(BlueObjectMetadata, "GetItems", blue.method, meta.adapted);
