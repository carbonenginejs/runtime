import { CjsSchema, meta } from "#schema";

/**
 * One synchronous receipt point for authored SOF edits, independent of UI and storage.
 * Ours: Carbon's INotify and IListNotify retain their native mutation duties;
 * this operator-requested manager reports completed edits to one consumer.
 * It neither dispatches events nor applies DNA changes to scene objects.
 */
@meta.define("CjsSOFEditManager")
export class CjsSOFEditManager
{
  /** The schema from the edited objects' realm. */
  _schema;
  /** One direct receiver, or null when only mutation results are needed. */
  _receive;

  constructor({ schema = CjsSchema, receive = null } = {})
  {
    if (receive !== null && typeof receive !== "function") throw new TypeError("SOF edit receiver must be a function.");
    this._schema = schema;
    this._receive = receive;
  }

  /**
   * Writes explicitly editable fields through the existing values service.
   * The caller targets the actual edited object, not a nested graph patch.
   * @param {object} target Authored object.
   * @param {object} values Declared field names and replacement values.
   * @param {*} context Caller-owned record context, returned untouched.
   * @returns {*} The values service's result.
   */
  SetValues(target, values, context = null)
  {
    const names = Object.keys(values);
    for (const name of names)
    {
      const field = this._Field(target, name);
      if (!field.edit.write || field.type.runtimeOnly)
        throw new TypeError(`SOF field is not editable: ${name}`);
      // Structural editing has its own capability/ownership rules. A nested
      // values patch would hide which descendants changed from this receipt.
      if (["root", "rootRef", "rootWeak", "list", "structList", "array", "map", "set", "rawStruct"].includes(field.type?.kind))
        throw new TypeError(`Use a structural edit for SOF field: ${name}`);
    }
    return this.Apply(target, names, () => this._schema.setValues(target, values), context, "set");
  }

  /**
   * Runs an admitted operation and reports its actual direct field changes once.
   * Providers retain creation, ownership and list admission policy. No-op and
   * rejected operations report nothing; a partial mutation is reported even if
   * the operation then throws. This is not a rollback transaction.
   * @param {object} target Object whose declared fields are affected.
   * @param {string[]} names Direct field names; collection edits name the owner field.
   * @param {Function} mutate Synchronous operation, already admitted by its provider.
   * @param {*} context Caller-owned context.
   * @param {string} operation Descriptive operation such as add, delete or move.
   * @returns {*} The operation's result.
   */
  Apply(target, names, mutate, context = null, operation = "set")
  {
    const fields = [...new Set(names)].map(name => this._Field(target, name));
    const before = fields.map(field => this._Read(target, field));
    let result, failure = null;
    try { result = mutate(); }
    catch (error) { failure = error; }
    const changes = [];
    fields.forEach((field, index) =>
    {
      const after = this._Read(target, field), previous = before[index];
      if (!this._Equal(previous, after)) changes.push({ name: field.name, kind: field.type?.kind, before: previous, after });
    });
    if (changes.length && this._receive)
    {
      try { this._receive({ target, context, operation, changes }); }
      catch (error)
      {
        if (failure) throw new AggregateError([failure, error], "SOF edit and its receiver both failed.");
        throw error;
      }
    }
    if (failure) throw failure;
    return result;
  }

  /** Reports a newly admitted root without inventing field changes. */
  Added(target, context = null)
  {
    if (this._receive) this._receive({ target, context, operation: "addRoot", changes: [] });
  }

  /** Resolves declared names, including indexed fields. */
  _Field(target, name)
  {
    const field = this._schema.getField(target.constructor, name);
    if (!field || field.type?.runtimeOnly) throw new TypeError(`Unknown authored SOF field: ${name}`);
    return field;
  }

  /** Snapshots direct values; list items remain object identities, never cloned graphs. */
  _Read(target, field)
  {
    const stored = target[field.key ?? field.name];
    const value = field.index === undefined ? stored : stored[field.index];
    if (Array.isArray(value) || ArrayBuffer.isView(value)) return Array.from(value);
    if (value instanceof Map) return new Map(value);
    if (value instanceof Set) return new Set(value);
    return value;
  }

  /** Compares scalar/vector values and collection membership/order. */
  _Equal(a, b)
  {
    if (Object.is(a, b)) return true;
    if (a instanceof Map && b instanceof Map)
    {
      if (a.size !== b.size) return false;
      const entries = [...b];
      return [...a].every(([key, value], index) => Object.is(key, entries[index][0]) && Object.is(value, entries[index][1]));
    }
    if (a instanceof Set && b instanceof Set) return this._Equal([...a], [...b]);
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  }
}
