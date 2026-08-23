import { CjsFormat } from '../../format/CjsFormat.js';
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
class CjsSchemaBoundFormat extends CjsFormat {
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
  static is(input, options = null) {
    try {
      return ROOT_TYPES.has(this.schema(options?.schema ?? input).type);
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
  static probeSupport(input, options = null) {
    const usable = this.is(input, options);
    return {
      format: this.id,
      source: options?.source || "buffer",
      recognized: usable,
      supported: usable,
      preferredOutput: usable ? OUTPUT_JSON : "",
      reason: usable ? "The supplied schema declares a root this reader can decode." : "A readable companion schema was not supplied.",
      variants: [{
        kind: OUTPUT_JSON,
        supported: usable
      }, {
        kind: OUTPUT_PAYLOAD,
        supported: usable
      }],
      metadata: usable ? this.inspect(input, options) : {
        family: this.id,
        requiresSchema: true,
        decodable: false
      }
    };
  }

  /** Return schema and payload facts without decoding the payload. */
  static inspect(input, options = null) {
    const schema = this.schema(options?.schema ?? input);
    return {
      family: this.id,
      rootType: schema.type,
      requiresSchema: true,
      decodable: ROOT_TYPES.has(schema.type),
      byteLength: options?.schema === undefined ? null : Normalize(input).byteLength
    };
  }

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
    const output = options.emit ?? options.output ?? OUTPUT_JSON;
    return output === OUTPUT_PAYLOAD ? decoded : ToJSON(decoded);
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
  static mediaTypes = Object.freeze(["data"]);
  static outputs = CjsFormat.defineOutputs({
    json: {
      default: true,
      decoded: true
    },
    payload: {
      decoded: true
    }
  });
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
