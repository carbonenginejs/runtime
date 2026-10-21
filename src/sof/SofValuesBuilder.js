// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOF.cpp
//
// Split out of EveSOF.js, where it was a second module-private class.
import { CjsSchema } from "#schema";
import { IsModelValuesReference, IsModelValuesRoot, VALUES_LITERAL_DOLLAR_REF } from "./sofValues.js";


/**
 * Assembles one SOF build as model values.
 *
 * The build stages add nodes (`AddNode` returns a `{ $ref }` handle) and link
 * them through those handles; `ToValues` then emits the nested values graph,
 * giving `_id`/`_ref` only to nodes reached more than once. The handles never
 * leave the builder.
 */
export class SofValuesBuilder
{

  _nodes = [];

  _roots = [];

  /**
   * Allocates the next node, stores its fields and optional raw data, and
   * returns its handle.
   *
   * @param {string} kind The node's `_type`.
   * @param {object} fields The node's values, which may hold handles.
   * @param {?object} [raw] Values merged after `fields` on output.
   * @returns {{ $ref: number }} The node's handle.
   */
  AddNode(kind, fields, raw = null)
  {
    const node = { id: this._nodes.length + 1, kind, fields };
    if (raw && Object.keys(raw).length) node.raw = raw;
    this._nodes.push(node);
    return { $ref: node.id };
  }

  /**
   * Imports one self-describing values graph with explicit type tags.
   *
   * Every model must carry `_type`: this class deliberately has no registry or
   * schema library from which to infer the type of an untagged nested object.
   * IDs are fragment-local labels, so they are remapped to this builder's node
   * handles.
   *
   * @param {object} values A values root carrying `_type`.
   * @returns {{ $ref: number }} The imported root's handle.
   */
  ImportValuesRoot(values)
  {
    if (!IsModelValuesRoot(values))
    {
      throw new TypeError("EveSOF values fragment requires a self-describing root with _type");
    }

    const refByValue = new WeakMap();
    const refById = new Map();
    const visited = new WeakSet();

    const allocate = value =>
    {
      if (Array.isArray(value))
      {
        for (const item of value) allocate(item);
        return;
      }
      if (!value || typeof value !== "object") return;
      if (IsModelValuesReference(value))
      {
        if (Object.keys(value).length !== 1)
        {
          throw new TypeError("EveSOF values fragment reference must contain only _ref");
        }
        return;
      }
      if (visited.has(value)) return;
      visited.add(value);

      if (Object.hasOwn(value, "_type"))
      {
        if (typeof value._type !== "string" || value._type.length === 0)
        {
          throw new TypeError("EveSOF values fragment model requires a non-empty string _type");
        }
        const ref = this.AddNode(value._type, {});
        refByValue.set(value, ref);
        if (value._id !== undefined && value._id !== null)
        {
          if (refById.has(value._id))
          {
            throw new TypeError(`EveSOF values fragment contains duplicate _id ${JSON.stringify(value._id)}`);
          }
          refById.set(value._id, ref);
        }
      }
      else if (value._id !== undefined && value._id !== null)
      {
        throw new TypeError("EveSOF values fragment requires _type on every identified model");
      }

      for (const [key, item] of Object.entries(value))
      {
        if (key !== "_type" && key !== "_id") allocate(item);
      }
    };

    allocate(values);
    const populated = new WeakSet();
    const convert = value =>
    {
      if (Array.isArray(value)) return value.map(convert);
      if (!value || typeof value !== "object") return value;
      if (IsModelValuesReference(value))
      {
        const ref = refById.get(value._ref);
        if (!ref)
        {
          throw new TypeError(`EveSOF values fragment _ref ${JSON.stringify(value._ref)} does not exist`);
        }
        return { $ref: ref.$ref };
      }

      const ref = refByValue.get(value);
      if (ref)
      {
        if (!populated.has(value))
        {
          populated.add(value);
          const node = this.GetNode(ref.$ref);
          const fields = Object.fromEntries(Object.entries(value)
            .filter(([key]) => key !== "_type" && key !== "_id")
            .map(([key, item]) => [key, convert(item)]));
          if (Object.hasOwn(value, "$ref")) fields[VALUES_LITERAL_DOLLAR_REF] = true;
          node.fields = fields;
        }
        return { $ref: ref.$ref };
      }

      const record = Object.fromEntries(Object.entries(value).map(([key, item]) => [key, convert(item)]));
      if (Object.hasOwn(value, "$ref")) record[VALUES_LITERAL_DOLLAR_REF] = true;
      return record;
    };

    return convert(values);
  }

  /**
   * Resolves a one-based node identifier to its mutable record, returning null
   * outside the allocated table.
   *
   * @param {number} id A handle's `$ref`.
   * @returns {?object} The node record.
   */
  GetNode(id)
  {
    return this._nodes[id - 1] ?? null;
  }

  /**
   * Records the build's root handle.
   *
   * @param {string} name The root's name.
   * @param {{ $ref: number }} ref The root's handle.
   */
  AddRoot(name, ref)
  {
    this._roots.push({ name, ref });
  }

  /**
   * Emits the build as one nested model-values root.
   *
   * A node becomes `{ _type, ...fields, ...raw }`; a node reached more than
   * once gets an `_id` on its first emission and is a `{ _ref }` afterwards.
   * Ids are allocated in emission order. The output is sparse unless
   * `options.populateDefaults` is true, which overlays the defaults of class
   * families the caller has registered (`CjsSchema.applyDefaults`), without
   * constructing anything.
   *
   * @param {object} [options] Output options.
   * @param {boolean} [options.populateDefaults] Overlay registered class defaults.
   * @returns {object} The values root.
   */
  ToValues(options = {})
  {
    const rootRef = this._roots[0]?.ref;
    if (!IsHandle(rootRef))
    {
      throw new TypeError("EveSOF values output requires one root.");
    }

    // A node reachable more than once is shared topology and needs an identity;
    // one reachable once is ordinary nesting and needs none. Counting first
    // keeps `_id` off the great majority of nodes.
    const visits = new Map();
    this._CountVisits(rootRef, visits);

    const values = this._EmitValue(rootRef, visits, new Map(), { nextId: 1 });
    const populateDefaults = options?.populateDefaults ?? false;
    if (typeof populateDefaults !== "boolean")
    {
      throw new TypeError("EveSOF populateDefaults option must be a boolean.");
    }
    return populateDefaults ? CjsSchema.applyDefaults(values) : values;
  }

  /** Counts how many times each node is reached from `value`. */
  _CountVisits(value, visits)
  {
    if (value?.[VALUES_LITERAL_DOLLAR_REF])
    {
      for (const item of Object.values(value)) this._CountVisits(item, visits);
      return;
    }

    if (IsHandle(value))
    {
      const id = Number(value.$ref);
      const seen = visits.get(id) ?? 0;
      visits.set(id, seen + 1);
      if (seen) return;

      const node = this.GetNode(id);
      if (!node) return;

      this._CountVisits(node.fields ?? {}, visits);
      this._CountVisits(node.raw ?? {}, visits);
      return;
    }

    if (Array.isArray(value))
    {
      for (const item of value) this._CountVisits(item, visits);
      return;
    }

    if (value && typeof value === "object")
    {
      for (const item of Object.values(value)) this._CountVisits(item, visits);
    }
  }

  /**
   * Emits one value. `emitted` maps a node id to the `_id` it was given on
   * first emission, so a later occurrence becomes `{ _ref }`.
   */
  _EmitValue(value, visits, emitted, state)
  {
    if (value?.[VALUES_LITERAL_DOLLAR_REF])
    {
      return Object.fromEntries(Object.entries(value)
        .map(([key, item]) => [key, this._EmitValue(item, visits, emitted, state)]));
    }

    if (IsHandle(value))
    {
      const id = Number(value.$ref);

      if (emitted.has(id)) return { _ref: emitted.get(id) };

      const node = this.GetNode(id);
      if (!node) throw new TypeError(`EveSOF values output found no node for handle ${id}.`);

      const projected = { _type: node.kind };

      if ((visits.get(id) ?? 0) > 1)
      {
        const valueId = state.nextId++;
        emitted.set(id, valueId);
        projected._id = valueId;
      }

      // `raw` merges after `fields`: one object whose properties are the node's.
      for (const [key, item] of Object.entries({ ...node.fields, ...node.raw }))
      {
        projected[key] = this._EmitValue(item, visits, emitted, state);
      }

      return projected;
    }

    if (Array.isArray(value))
    {
      return value.map(item => this._EmitValue(item, visits, emitted, state));
    }

    if (value && typeof value === "object")
    {
      return Object.fromEntries(Object.entries(value)
        .map(([key, item]) => [key, this._EmitValue(item, visits, emitted, state)]));
    }

    return value;
  }

}

/** A builder node handle: an object whose only key is `$ref`. */
function IsHandle(value)
{
  return Boolean(value && typeof value === "object" && Object.keys(value).length === 1 && Object.hasOwn(value, "$ref"));
}

CjsSchema.meta.define("SofValuesBuilder")(SofValuesBuilder);
