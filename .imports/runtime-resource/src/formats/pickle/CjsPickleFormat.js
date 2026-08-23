import { CjsFormat } from "../../format/CjsFormat.js";
import {
  CjsPickleProtocol0Reader,
  PICKLE_PROTOCOL_0_LIMITS
} from "./core/CjsPickleProtocol0Reader.js";

const OUTPUT_JSON = "json";
const OUTPUT_PAYLOAD = "payload";
const OUTPUT_RAW = "raw";
const OUTPUTS = new Set([ OUTPUT_JSON, OUTPUT_PAYLOAD, OUTPUT_RAW ]);
const OPTION_NAMES = new Set([ "emit", "limits" ]);
const DEFAULT_VALUES = {
  emit: OUTPUT_JSON,
  limits: PICKLE_PROTOCOL_0_LIMITS
};

/**
 * Data-only Python pickle format facade that currently decodes protocol 0 into
 * JSON-compatible values or identity-preserving payload graphs while rejecting
 * callable and object-construction opcodes.
 */
export class CjsPickleFormat extends CjsFormat
{
  #values = DEFAULT_VALUES;

  /**
   * Create a reusable protocol-0 pickle format profile.
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
    this.#values = this.constructor.normalizeValues(this.#values, options);
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
    return this.constructor.normalizeValues(this.#values, options);
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
   * Decode a JSON-compatible graph through the protocol-0 implementation.
   *
   * @param {ArrayBuffer|ArrayBufferView} input Pickle bytes.
   * @param {object} [options] Format options.
   * @returns {*} JSON-compatible decoded graph.
   */
  static readJSON(input, options = {})
  {
    const values = this.normalizeValues(DEFAULT_VALUES, options);
    return new CjsPickleProtocol0Reader(input, values).ReadJSON();
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
    return new CjsPickleProtocol0Reader(input, values).Read();
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

  /** Validate protocol-0 structure and return format metadata. */
  static inspect(input, options = {})
  {
    const { source: _source, ...readOptions } = options;
    const value = this.readPayload(input, readOptions);
    const byteLength = input instanceof ArrayBuffer
      ? input.byteLength
      : ArrayBuffer.isView(input) ? input.byteLength : 0;
    return {
      protocol: 0,
      byteLength,
      rootType: value === null ? "null" : Array.isArray(value) ? "array" : typeof value
    };
  }

  /** Return synchronous advisory support from a bounded protocol-0 decode. */
  static probeSupport(input, options = {})
  {
    try
    {
      return {
        format: this.id,
        recognized: true,
        supported: true,
        preferredOutput: OUTPUT_JSON,
        metadata: this.inspect(input, options),
        variants: [
          { kind: OUTPUT_JSON, supported: true },
          { kind: OUTPUT_PAYLOAD, supported: true },
          { kind: OUTPUT_RAW, supported: true }
        ],
        reason: "The input is a supported inert protocol-0 pickle."
      };
    }
    catch (error)
    {
      return {
        format: this.id,
        recognized: false,
        supported: false,
        metadata: null,
        reason: error.message,
        errors: [ error.message ]
      };
    }
  }

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

    const baseLimits = base.limits || PICKLE_PROTOCOL_0_LIMITS;
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

  static Output = Object.freeze({
    JSON: OUTPUT_JSON,
    PAYLOAD: OUTPUT_PAYLOAD,
    RAW: OUTPUT_RAW
  });
  static supportedProtocols = Object.freeze([ 0 ]);
  static id = "pickle";
  static extensions = Object.freeze([ ".pickle" ]);
  static mediaTypes = Object.freeze([ "data" ]);
  static outputs = CjsFormat.defineOutputs({
      json: { default: true, decoded: true },
      payload: { decoded: true },
      raw: { role: "debug", decoded: true }
  });
}

export default CjsPickleFormat;
