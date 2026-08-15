import { CjsYamlFormat } from '../yaml/CjsYamlFormat.js';
import { ReadValue } from './core/schemaBoundValues.js';
import { SchemaBoundError } from './core/schemaBoundErrors.js';

const OUTPUT_JSON = "json";
const OUTPUT_PAYLOAD = "payload";
const ROOT_TYPES = new Set(["dict", "list", "object"]);

/**
 * Reads a container whose layout lives in a separate schema.
 *
 * This is the third of the three families that share the `.static` extension,
 * and the one an extension check is least able to help with: the bytes carry no
 * signature, no version and no self-description. What they carry is a payload
 * whose every field position, width and meaning is stated in a sibling `.schema`
 * document — so the schema is not a hint here, it is the reader.
 *
 * That makes this the opposite of the hash-identified containers, where the
 * header names a layout it does not describe and the layout has to be derived
 * and pinned per dataset. Nothing needs deriving for this family. Supply the
 * schema and the bytes decode.
 *
 * **The schema is required and there is no default.** Given the wrong schema
 * these bytes decode into plausible nonsense rather than failing, because there
 * is nothing in them to disagree with. Pair each payload with the `.schema`
 * that shipped beside it.
 *
 * Read {@link CjsSchemaBoundFormat.read} before writing anything that walks the
 * result: a record's variable section changes length from record to record, and
 * a decoder written around a constant stride will read the first record
 * correctly and everything after it wrongly.
 */
class CjsSchemaBoundFormat {
  /**
   * Reports whether a schema can drive this reader.
   *
   * The question is about the schema, never the payload. These containers have
   * no signature to test, so claiming to recognize the bytes would be a claim
   * this format cannot support - and `CjsStaticFormat` already answers which
   * family a `.static` file belongs to.
   *
   * @param {object|Uint8Array|ArrayBuffer|string} schema Schema document or its bytes.
   * @returns {boolean} True when the schema has a root this reader understands.
   */
  static is(schema) {
    try {
      return ROOT_TYPES.has(this.schema(schema).type);
    } catch {
      return false;
    }
  }

  /**
   * Reports whether this format can read a payload described by a schema.
   *
   * @param {object|Uint8Array|ArrayBuffer|string} schema Schema document or its bytes.
   * @param {object} [options] Probe options.
   * @returns {object} Resource probe.
   */
  static isSupported(schema, options = null) {
    return Probe(this.is(schema), options);
  }

  // INTERIM, 2026-08-16. No `inspect` alias, matching CjsSqliteFormat and
  // diverging from the older formats. Both are held by the same undecided
  // question; see maintenance/INTERIM-sqlite-and-static-2026-08-16.md.

  /**
   * Reads a container against its schema.
   *
   * The whole payload decodes in one pass. Three properties are worth knowing
   * before relying on the result:
   *
   * - **A keyed container's index is at the end.** Nothing at the front points
   *   at it; it is found by reading the last four bytes as the index's own size.
   * - **Record offsets are relative to the four-byte header**, not to the file.
   *   Decoding from the file start reads one field early, which looks like a
   *   wrong layout rather than a wrong base.
   * - **The per-record offset table varies in length.** An optional attribute
   *   that is absent occupies no slot, so consecutive records hold their
   *   variable data at different distances from their own start.
   *
   * An absent optional takes the default its schema declares. Where none is
   * declared the attribute is left off the record entirely, which is what the
   * published static data exports show for those same rows.
   *
   * @param {Uint8Array|ArrayBuffer} input Container bytes.
   * @param {object} options Read options.
   * @param {object|Uint8Array|ArrayBuffer|string} options.schema The sibling schema.
   * @param {string} [options.output] `json` or `payload`.
   * @returns {object|Array} The decoded container.
   */
  static read(input, options = {}) {
    const bytes = Normalize(input);
    const schema = this.schema(options.schema);
    if (!ROOT_TYPES.has(schema.type)) {
      throw SchemaBoundError(`A container's root must be a dict, list or object, not ${schema.type}.`);
    }
    const context = {
      bytes,
      view: new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    };
    const decoded = ReadValue(context, 0, schema).value;
    return options.output === OUTPUT_PAYLOAD ? decoded : ToJSON(decoded);
  }

  /** Reads to plain JSON-compatible values. */
  static readJSON(input, options = {}) {
    return this.read(input, {
      ...options,
      output: OUTPUT_JSON
    });
  }

  /** Reads with wide integers left as `BigInt`. */
  static readPayload(input, options = {}) {
    return this.read(input, {
      ...options,
      output: OUTPUT_PAYLOAD
    });
  }

  /**
   * Parses a schema document, accepting YAML bytes, YAML text or a parsed object.
   *
   * @param {object|Uint8Array|ArrayBuffer|string} schema Schema in any accepted form.
   * @returns {object} The parsed schema.
   */
  static schema(schema) {
    if (!schema) {
      throw SchemaBoundError("This format cannot read a container without its schema.");
    }
    if (typeof schema === "object" && !ArrayBuffer.isView(schema) && !(schema instanceof ArrayBuffer)) {
      return schema;
    }
    const parsed = CjsYamlFormat.read(typeof schema === "string" ? schema : Normalize(schema));
    if (!parsed || typeof parsed !== "object") {
      throw SchemaBoundError("A schema must parse to a mapping.");
    }
    return Resolve(parsed);
  }
  static Output = Object.freeze({
    JSON: OUTPUT_JSON,
    PAYLOAD: OUTPUT_PAYLOAD
  });
  static id = "schemabound";
  static extensions = Object.freeze([".static"]);
  static type = Object.freeze(["data"]);
  static mediaTypes = Object.freeze(["data"]);
  static inputTypes = Object.freeze(["schemabound"]);
  static outputTypes = Object.freeze([OUTPUT_JSON, OUTPUT_PAYLOAD]);
}

/**
 * Rejoins YAML anchors and aliases into the graph they describe.
 *
 * These schemas share repeated declarations by anchor - a container with two
 * coordinates writes the vector's component aliases once - and the YAML reader
 * reports that sharing as `$yamlId` and `$yamlRef` markers rather than
 * duplicating the node. Left alone, `$yamlId` reads as one more component and
 * `$yamlRef` as a declaration with no fields at all.
 *
 * @param {*} value Parsed schema, or any part of one.
 * @returns {*} The same schema with anchors resolved and markers removed.
 */
function Resolve(value) {
  const anchors = new Map();
  const walk = node => {
    if (Array.isArray(node)) return node.map(walk);
    if (!node || typeof node !== "object") return node;
    if (Object.hasOwn(node, "$yamlRef")) {
      const target = anchors.get(node.$yamlRef);
      if (!target) {
        throw SchemaBoundError(`The schema refers to an anchor it never declares: ${node.$yamlRef}.`);
      }
      return target;
    }
    const result = {};
    const id = node.$yamlId;
    if (id !== undefined) anchors.set(id, result);
    for (const [key, member] of Object.entries(node)) {
      if (key !== "$yamlId") result[key] = walk(member);
    }
    return result;
  };
  return walk(value);
}

/** Builds the probe shape the resource manager routes on. */
function Probe(usable, options) {
  return {
    format: "schemabound",
    source: "buffer",
    supported: usable ? "full" : "none",
    confidence: usable ? 1 : 0,
    preferred: "schemabound",
    // The schema is read to answer this, so it is measured rather than declared.
    // It says nothing about any payload: these containers carry no signature.
    verified: true,
    reason: usable ? "The schema declares a root this reader can decode." : "The schema is missing, unparsable, or declares an unreadable root.",
    variants: [{
      kind: "container",
      codec: "schemabound",
      supported: usable
    }],
    metadata: {
      family: "schemabound",
      requiresSchema: true,
      decodable: usable
    },
    ...(options || {})
  };
}

/** Converts decoded values to something `JSON.stringify` keeps losslessly. */
function ToJSON(value) {
  if (typeof value === "bigint") return value.toString(10);
  if (Array.isArray(value)) return value.map(ToJSON);
  if (value && typeof value === "object") {
    const result = {};
    for (const [key, member] of Object.entries(value)) result[key] = ToJSON(member);
    return result;
  }
  return value;
}

/** Accepts the byte forms every other format here accepts. */
function Normalize(input) {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  throw SchemaBoundError("A schema-bound container must be supplied as bytes.");
}

export { CjsSchemaBoundFormat };
//# sourceMappingURL=CjsSchemaBoundFormat.js.map
