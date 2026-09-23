import { CjsFormat } from "../../format/CjsFormat.js";
import { CjsPickleProtocol0Reader } from "./core/CjsPickleProtocol0Reader.js";
import { CjsPickleProtocol4Reader } from "./core/CjsPickleProtocol4Reader.js";
import { PICKLE_LIMITS, normalizeBytes } from "./core/pickleCommon.js";

const OUTPUT_JSON = "json";
const OUTPUT_PAYLOAD = "payload";
const OUTPUT_RAW = "raw";
const OUTPUTS = new Set([ OUTPUT_JSON, OUTPUT_PAYLOAD, OUTPUT_RAW ]);
const OPTION_NAMES = new Set([ "emit", "limits" ]);
const DEFAULT_VALUES = {
  emit: OUTPUT_JSON,
  limits: PICKLE_LIMITS
};

const PROTO = 0x80;

/**
 * Choose the reader for one input.
 *
 * Protocol 0 is printable text and has no header. Every binary protocol opens
 * with `PROTO`, which is the only opcode the text protocol cannot begin with,
 * so the first byte separates them without guessing - and the binary reader
 * then reads the declared version out of that same opcode.
 *
 * @param {ArrayBuffer|ArrayBufferView} input Pickle bytes.
 * @returns {Function} Reader class for the input.
 */
function readerFor(input)
{
  const bytes = normalizeBytes(input);
  return bytes.length && bytes[0] === PROTO
    ? CjsPickleProtocol4Reader
    : CjsPickleProtocol0Reader;
}

/**
 * Data-only Python pickle format facade that decodes the inert subset of
 * protocols 0 through 4 into JSON-compatible values or identity-preserving
 * payload graphs while rejecting callable and object-construction opcodes.
 */
export class CjsPickleFormat extends CjsFormat
{
  _values = DEFAULT_VALUES;

  /**
   * Create a reusable pickle format profile.
   *
   * @param {object} [options] Emit mode and bounded decoder limits.
   */
  constructor(options = {})
  {
    super();
    this.SetValues(options);
  }

  /**
   * Apply supported format options to this profile.
   *
   * @param {object} [options] Emit mode and partial decoder limits.
   * @returns {CjsPickleFormat} This format profile.
   */
  SetValues(options = {})
  {
    this._values = this.constructor.normalizeValues(this._values, options);
    return this;
  }

  /**
   * Return normalized format values with optional per-call overrides.
   *
   * @param {object} [options] Per-call format options.
   * @returns {object} Detached effective values.
   */
  GetValues(options = {})
  {
    return this.constructor.normalizeValues(this._values, options);
  }

  /**
   * Decode according to the effective emit mode.
   *
   * @param {ArrayBuffer|ArrayBufferView} input Pickle bytes.
   * @param {object} [options] Per-call format options.
   * @returns {*} Decoded value graph.
   */
  Read(input, options = {})
  {
    return CjsPickleFormat.read(input, this.GetValues(options));
  }

  /**
   * Decode a JSON-compatible graph, rejecting cyclic memo references.
   *
   * @param {ArrayBuffer|ArrayBufferView} input Pickle bytes.
   * @param {object} [options] Per-call format options.
   * @returns {*} JSON-compatible decoded graph.
   */
  ReadJSON(input, options = {})
  {
    return CjsPickleFormat.readJSON(input, this.GetValues(options));
  }

  /**
   * Decode the inert payload while preserving memo object identity.
   *
   * @param {ArrayBuffer|ArrayBufferView} input Pickle bytes.
   * @param {object} [options] Per-call format options.
   * @returns {*} Decoded payload graph.
   */
  ReadPayload(input, options = {})
  {
    return CjsPickleFormat.readPayload(input, this.GetValues(options));
  }

  /**
   * Decode the exact inert graph while preserving memo aliases and cycles.
   *
   * @param {ArrayBuffer|ArrayBufferView} input Pickle bytes.
   * @param {object} [options] Per-call format options.
   * @returns {*} Decoded raw graph.
   */
  ReadRaw(input, options = {})
  {
    return CjsPickleFormat.readRaw(input, this.GetValues(options));
  }

  /**
   * Verify that a decoded graph is JSON-compatible without changing its shape.
   *
   * @param {*} value Candidate decoded graph.
   * @returns {*} The supplied value.
   */
  ToJSON(value)
  {
    return CjsPickleFormat.toJSON(value);
  }

  /**
   * Decode according to the requested emit mode.
   *
   * @param {ArrayBuffer|ArrayBufferView} input Pickle bytes.
   * @param {object} [options] Format options.
   * @returns {*} Decoded value graph.
   */
  static read(input, options = {})
  {
    const values = this.normalizeValues(DEFAULT_VALUES, options);
    if (values.emit === OUTPUT_RAW) return this.readRaw(input, values);
    if (values.emit === OUTPUT_PAYLOAD) return this.readPayload(input, values);
    return this.readJSON(input, values);
  }

  /**
   * Decode a JSON-compatible graph through the implementation for its protocol.
   *
   * @param {ArrayBuffer|ArrayBufferView} input Pickle bytes.
   * @param {object} [options] Format options.
   * @returns {*} JSON-compatible decoded graph.
   */
  static readJSON(input, options = {})
  {
    const values = this.normalizeValues(DEFAULT_VALUES, options);
    return new (readerFor(input))(input, values).ReadJSON();
  }

  /**
   * Decode an inert payload while preserving pickle memo identity.
   *
   * @param {ArrayBuffer|ArrayBufferView} input Pickle bytes.
   * @param {object} [options] Format options.
   * @returns {*} Decoded payload graph.
   */
  static readPayload(input, options = {})
  {
    const values = this.normalizeValues(DEFAULT_VALUES, options);
    return new (readerFor(input))(input, values).Read();
  }

  /**
   * Decode the exact inert graph while preserving memo aliases and cycles.
   *
   * @param {ArrayBuffer|ArrayBufferView} input Pickle bytes.
   * @param {object} [options] Format options.
   * @returns {*} Decoded raw graph.
   */
  static readRaw(input, options = {})
  {
    return this.readPayload(input, options);
  }

  /**
   * Verify that a decoded graph is JSON-compatible without changing its shape.
   *
   * @param {*} value Candidate decoded graph.
   * @returns {*} The supplied value.
   */
  static toJSON(value)
  {
    return CjsPickleProtocol0Reader.ToJSON(value);
  }

  /** Validate pickle structure and return format metadata. */
  static inspect(input, options = {})
  {
    const { source: _source, ...readOptions } = options;
    const value = this.readPayload(input, readOptions);
    const bytes = normalizeBytes(input);
    const byteLength = bytes.byteLength;
    return {
      protocol: bytes.length && bytes[0] === PROTO ? bytes[1] : 0,
      byteLength,
      rootType: value === null ? "null" : Array.isArray(value) ? "array" : typeof value
    };
  }

  /** Return synchronous advisory support from a bounded protocol-0 decode. */

  /**
   * Normalize a format profile and partial override into detached effective
   * values.
   *
   * @param {object} base Existing normalized values.
   * @param {object} [options] Partial emit and limit overrides.
   * @returns {object} Detached normalized values.
   */
  static normalizeValues(base, options = {})
  {
    if (!options || typeof options !== "object" || Array.isArray(options))
    {
      throw new TypeError("CjsPickleFormat options must be an object.");
    }
    for (const name of Object.keys(options))
    {
      if (!OPTION_NAMES.has(name))
      {
        throw new TypeError(`CjsPickleFormat unknown option ${JSON.stringify(name)}.`);
      }
    }

    const emit = options.emit ?? base.emit;
    if (!OUTPUTS.has(emit))
    {
      throw new TypeError(`CjsPickleFormat unknown emit value ${JSON.stringify(emit)}.`);
    }

    const baseLimits = base.limits || PICKLE_LIMITS;
    const optionLimits = options.limits ?? {};
    if (!optionLimits || typeof optionLimits !== "object" || Array.isArray(optionLimits))
    {
      throw new TypeError("CjsPickleFormat limits must be an object.");
    }

    return {
      emit,
      limits: {
        ...baseLimits,
        ...optionLimits
      }
    };
  }

  static supportedProtocols = [ 0, 1, 2, 3, 4 ];
  static id = "CjsPickleFormat";
  static extensions = [ ".pickle" ];
  static mediaTypes = [ "data" ];
  static outputs = CjsFormat.defineOutputs({
      json: { default: true, decoded: true },
      payload: { decoded: true },
      raw: { role: "debug", decoded: true }
  });
}

export default CjsPickleFormat;
