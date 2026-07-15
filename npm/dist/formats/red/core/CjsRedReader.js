import { resolveHydrationAdapter } from '@carbonenginejs/core-types/hydration';
import { parseRed, isTypedTable, decodeTypedTable, isStrippedKey } from './redGraph.js';

/**
 * Reads a Red (YAML) object graph.
 *
 * The graph is type-discriminated (`type:` per node) and self-referential
 * (YAML anchors/aliases share object identities). This reader walks it into
 * one of three shapes, sharing repeated nodes and always stripping
 * authoring-tool keys (double-underscore prefixed).
 */
class CjsRedReader {
  constructor(input, options = {}) {
    this.options = {
      ...options
    };
    this.root = parseRed(input, options);
    this.adapter = resolveHydrationAdapter(options);
    this.hydrationOptions = {
      ...options,
      markDirty: false,
      skipUpdate: true,
      skipEvents: true
    };
    this.mode = "payload";
    this.ResetReadState();
  }
  ResetReadState() {
    this.refs = new Map(); // source object -> hydrated target
    this.ids = new Map(); // source object -> reference id
    this.nextId = this.options.firstId || 1;
    this.runtimeInstances = [];
    this.reports = [];
  }
  Inspect() {
    const typeCounts = {};
    const seen = new Set();
    let nodeCount = 0;
    const visit = node => {
      if (Array.isArray(node)) {
        node.forEach(visit);
        return;
      }
      if (isTypedTable(node)) return;
      if (!node || typeof node !== "object") return;
      if (seen.has(node)) return;
      seen.add(node);
      if (typeof node.type === "string") {
        nodeCount++;
        typeCounts[node.type] = (typeCounts[node.type] || 0) + 1;
      }
      for (const key of Object.keys(node)) {
        if (isStrippedKey(key)) continue;
        visit(node[key]);
      }
    };
    visit(this.root);
    return {
      format: {
        id: "red"
      },
      root: {
        type: this.RootType()
      },
      nodeCount,
      typeCounts
    };
  }
  RootType() {
    return this.root && typeof this.root === "object" && typeof this.root.type === "string" ? this.root.type : null;
  }
  Read() {
    return this.ReadPayload();
  }
  ReadPayload() {
    this.mode = "payload";
    this.ResetReadState();
    const object = this.Hydrate(this.root);
    return {
      comments: this.reports,
      object
    };
  }
  ReadRuntime() {
    this.mode = "runtime";
    this.ResetReadState();
    const root = this.Hydrate(this.root);

    // Phase 3: whole graph built and references resolved - finalize once
    // per instance, children before parents (completion order).
    for (const record of this.runtimeInstances) {
      this.adapter.finalize(record.instance, {
        kind: record.type
      });
    }
    return {
      root,
      format: {
        id: "red"
      },
      reports: this.reports
    };
  }
  ReadRaw() {
    this.mode = "raw";
    this.ResetReadState();
    return this.Hydrate(this.root);
  }
  Hydrate(node) {
    if (Array.isArray(node)) return node.map(item => this.Hydrate(item));
    if (isTypedTable(node)) return decodeTypedTable(node).map(row => this.Hydrate(row));
    if (node && typeof node === "object") {
      if (this.refs.has(node)) return this.MakeReference(node);
      const type = typeof node.type === "string" ? node.type : null;
      const target = this.CreateTarget(type);
      this.refs.set(node, target);
      const values = {};
      for (const key of Object.keys(node)) {
        if (isStrippedKey(key)) continue;
        if (key === "type" && this.mode !== "raw") continue;
        values[key] = this.Hydrate(node[key]);
      }
      this.AssignValues(target, values, type);
      return target;
    }
    return node;
  }
  CreateTarget(type) {
    if (this.mode === "runtime") {
      const built = this.adapter.construct(type, {
        kind: type,
        options: this.options
      });
      if (built !== undefined) return built;
      const ClassConstructor = this.ResolveClass(type);
      if (ClassConstructor) return new ClassConstructor();
      return {
        _sourceClassName: type || null
      };
    }
    if (this.mode === "raw") return {};
    const typeField = this.GetPayloadField("payloadTypeField", "_type");
    return typeField && type ? {
      [typeField]: type
    } : {};
  }
  AssignValues(target, values, type) {
    if (this.mode === "runtime") {
      // Untyped maps are value objects inside a typed Red graph. They do
      // not participate in the runtime class lifecycle.
      if (!type) {
        Object.assign(target, values);
        return;
      }
      this.adapter.applyValues(target, values, {
        kind: type,
        options: this.hydrationOptions
      });
      this.runtimeInstances.push({
        instance: target,
        type
      });
      return;
    }
    Object.assign(target, values);
  }
  MakeReference(node) {
    const target = this.refs.get(node);
    if (this.mode !== "payload") return target;
    const idField = this.GetPayloadField("payloadIdField", "_id");
    const referenceField = this.GetPayloadField("payloadReferenceField", "_reference");
    const id = this.IdFor(node);
    if (idField && target && typeof target === "object" && !Object.prototype.hasOwnProperty.call(target, idField)) {
      target[idField] = id;
    }
    return referenceField ? {
      [referenceField]: id
    } : target;
  }
  IdFor(node) {
    let id = this.ids.get(node);
    if (id === undefined) {
      id = this.nextId++;
      this.ids.set(node, id);
    }
    return id;
  }
  GetPayloadField(name, fallback) {
    const value = this.options[name];
    return value === false ? null : value || fallback;
  }
  ResolveClass(type) {
    if (!type) return null;
    const classes = this.options.classes || {};
    const Schema = this.options.registry || null;
    return classes[type] || (Schema ? Schema.GetConstructor(type) : null);
  }
}

export { CjsRedReader };
//# sourceMappingURL=CjsRedReader.js.map
