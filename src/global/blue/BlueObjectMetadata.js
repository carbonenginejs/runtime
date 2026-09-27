// Source: blue/src/BlueObjectMetadata.h
// Source: blue/src/BlueObjectMetadata.cpp
//
// The object-metadata store: string keys to string values per object.
//
// ON THE OBJECT, not beside it. Carbon keeps a table keyed by weak reference
// (:33-47) and drops it when the object dies (`WeakRefNotify`, :150-153). Here
// the table IS the object's `__bluemetadata__` property - the reserved key a
// values bag carries it under (IBlueObjectMetadata.h:5) - so Carbon-shaped
// code through this store and `object.__bluemetadata__.colorType` see the same
// data (operator, 2026-09-27, as ccpwgl did). The property is not enumerable:
// metadata is never a member.
//
// `BeObjectMetadata` is the process-wide instance (:7-8).
import { CjsSchema, impl } from "#schema";
import { BLUE_OBJECT_METADATA_KEY, IBlueObjectMetadata } from "./IBlueObjectMetadata.js";

/** `BlueStdResult` codes the store answers with (`BLUE_STD_RESULT_OK`, `BLUE_STD_RESULT_KEY_ERROR`). */
const OK = Object.freeze({ ok: true, message: "" });
const KeyError = message => Object.freeze({ ok: false, message });


/** `BlueObjectMetadata` - the object-metadata store. */
export class BlueObjectMetadata extends IBlueObjectMetadata
{
  /**
   * The object's table (:23-31).
   *
   * @param {object} owner The object.
   * @returns {Object<string, string>|null} The table, or null when it has none.
   */
  GetMetadata(owner)
  {
    return (owner && Object.hasOwn(owner, BLUE_OBJECT_METADATA_KEY)) ? owner[BLUE_OBJECT_METADATA_KEY] : null;
  }

  /**
   * Sets one key (:33-47). Keys and values are strings, as Carbon's are.
   *
   * @param {object} owner The object.
   * @param {string} key The key.
   * @param {string} value The value.
   */
  Set(owner, key, value)
  {
    if (!owner) return;

    let table = this.GetMetadata(owner);
    if (!table)
    {
      table = {};
      Object.defineProperty(owner, BLUE_OBJECT_METADATA_KEY, { value: table, writable: true, configurable: true, enumerable: false });
    }
    table[String(key)] = String(value);
  }

  /**
   * One key's value (:49-61).
   *
   * @returns {string|*} The value, or `defaultValue`.
   */
  Get(owner, key, defaultValue = null)
  {
    const table = this.GetMetadata(owner);
    return table && Object.hasOwn(table, key) ? table[key] : defaultValue;
  }

  /**
   * Removes one key, and the object's table once it is empty (:63-80).
   *
   * @returns {{ok: boolean, message: string}} Carbon's `BlueStdResult`.
   */
  Delete(owner, key)
  {
    const table = this.GetMetadata(owner);
    if (!table) return KeyError("object not found in the database");
    if (!Object.hasOwn(table, key)) return KeyError("key not found in the database");
    delete table[key];
    if (!Object.keys(table).length) delete owner[BLUE_OBJECT_METADATA_KEY];
    return OK;
  }

  /**
   * Removes the object's table (:82-94).
   *
   * @returns {{ok: boolean, message: string}} Carbon's `BlueStdResult`.
   */
  DeleteObject(owner)
  {
    if (!this.GetMetadata(owner)) return KeyError("object not found in the database");
    delete owner[BLUE_OBJECT_METADATA_KEY];
    return OK;
  }

  /**
   * The object's keys (:113-128).
   *
   * @returns {{result: {ok: boolean, message: string}, keys: string[]}} Carbon's out argument comes back here.
   */
  GetKeys(owner)
  {
    const table = this.GetMetadata(owner);
    return table ? { result: OK, keys: Object.keys(table) } : { result: KeyError("object not found in the database"), keys: [] };
  }

  /**
   * Copies the source object's keys onto the target (:155-167).
   *
   * @returns {{ok: boolean, message: string}} Carbon's `BlueStdResult`.
   */
  CopyShallow(source, target)
  {
    for (const key of this.GetKeys(source).keys) this.Set(target, key, this.Get(source, key));
    return OK;
  }

  /**
   * Copies metadata across every object the source reaches (:169-...).
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

CjsSchema.define(BlueObjectMetadata, { className: "BlueObjectMetadata", carbon: "BlueObjectMetadata", family: "blue", fields: {} });
CjsSchema.decorateMethod(BlueObjectMetadata, "GetMetadata", impl.adapted);
CjsSchema.decorateMethod(BlueObjectMetadata, "Set", impl.adapted);
CjsSchema.decorateMethod(BlueObjectMetadata, "GetKeys", impl.adapted);
CjsSchema.decorateMethod(BlueObjectMetadata, "Delete", impl.adapted);
CjsSchema.decorateMethod(BlueObjectMetadata, "DeleteObject", impl.adapted);
CjsSchema.decorateMethod(BlueObjectMetadata, "CopyDeep", impl.notImplemented);
