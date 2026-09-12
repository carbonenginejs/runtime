// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOF.cpp
//
// Split out of EveSOF.js, where it was a second module-private class.
import { IsModelValuesReference, IsModelValuesRoot, VALUES_LITERAL_DOLLAR_REF, remapImportedValue } from "./sofDocumentValues.js";


/**
 * Allocates and links the internal compatibility node table, imports
 * self-describing values or legacy document fragments, and retains only nodes
 * reachable from its root.
 */
export class SofDocumentBuilder
{

  #nodes = [];

  #roots = [];

  /**
   * Allocates the next numeric node identifier, stores its fields and optional
   * raw data, and returns a document reference.
   */
  AddNode(kind, fields, raw = null)
  {
    const node = { id: this.#nodes.length + 1, kind, fields };
    if (raw && Object.keys(raw).length) node.raw = raw;
    this.#nodes.push(node);
    return { $ref: node.id };
  }

  /** Imports and remaps one complete carbon.document graph fragment. */
  ImportRoot(fragment, rootRef = fragment?.roots?.[0]?.ref)
  {
    if (!fragment || fragment.schema !== "carbon.document" || !Array.isArray(fragment.nodes))
    {
      throw new TypeError("EveSOF child resource document must be a carbon.document");
    }
    const refs = new Map();
    for (const source of fragment.nodes)
    {
      const id = Number(source?.id);
      if (!Number.isInteger(id) || id <= 0 || refs.has(id) || typeof source.kind !== "string")
      {
        throw new TypeError("EveSOF child resource document contains an invalid node");
      }
      refs.set(id, this.AddNode(source.kind, {}));
    }
    for (const source of fragment.nodes)
    {
      const target = this.GetNode(refs.get(Number(source.id)).$ref);
      target.fields = remapImportedValue(source.fields ?? {}, refs);
      if (source.raw && Object.keys(source.raw).length)
      {
        target.raw = remapImportedValue(source.raw, refs);
      }
    }
    const importedRoot = remapImportedValue(rootRef, refs);
    if (!importedRoot || !Number.isInteger(Number(importedRoot.$ref)))
    {
      throw new TypeError("EveSOF child resource document root is invalid");
    }
    return importedRoot;
  }

  /**
   * Imports one self-describing CjsModel-shaped values graph.
   *
   * Every model must carry `_type`: this class deliberately has no registry or
   * schema library from which to infer the type of an untagged nested object.
   * IDs are fragment-local labels, so they are remapped to this builder's node
   * IDs just as legacy document fragment IDs are.
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
   * Resolves a one-based document node identifier to its mutable record,
   * returning null outside the allocated table.
   */
  GetNode(id)
  {
    return this.#nodes[id - 1] ?? null;
  }

  /**
   * Records a named root reference for reachability analysis and final document
   * emission.
   */
  AddRoot(name, ref)
  {
    this.#roots.push({ name, ref });
  }

  /**
   * Emits the compatibility carbon.document envelope while pruning every node
   * unreachable from the recorded roots.
   */
  ToJSON()
  {
    const nodesById = new Map(this.#nodes.map(node => [node.id, node]));
    const reachable = new Set();
    const visitValue = value =>
    {
      if (Array.isArray(value))
      {
        value.forEach(visitValue);
        return;
      }
      if (!value || typeof value !== "object") return;
      if (value[VALUES_LITERAL_DOLLAR_REF])
      {
        Object.values(value).forEach(visitValue);
        return;
      }
      if (Object.hasOwn(value, "$ref"))
      {
        const id = Number(value.$ref);
        if (reachable.has(id)) return;
        const node = nodesById.get(id);
        if (!node) return;
        reachable.add(id);
        visitValue(node.fields);
        visitValue(node.raw);
        return;
      }
      Object.values(value).forEach(visitValue);
    };
    this.#roots.forEach(root => visitValue(root.ref));
    return {
      schema: "carbon.document",
      version: 1,
      format: { id: "runtime-sof", version: 1 },
      roots: this.#roots,
      nodes: this.#nodes.filter(node => reachable.has(node.id))
    };
  }

}
