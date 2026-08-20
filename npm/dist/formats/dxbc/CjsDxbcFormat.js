import { DxbcContainer } from './core/container.js';
import { disassembleInstructions } from './core/disassemble.js';
import { DEFAULT_VALUES, normalizeValues, readWithValues, inspectWithValues, toJsonValue, OUTPUT_JSON, OUTPUT_RAW } from './core/helpers.js';

/**
 * Exposed CarbonEngineJS-facing DXBC format class.
 *
 * Keep this file small and reviewable: container/signature/program parsing
 * and the instruction decoder live in core/; input/option normalization and
 * the shared read path live in core/helpers.js.
 */

const FORMAT_NAME = "CjsDxbcFormat";

/**
 * Resolves whatever the caller has to the decoder record a listing needs.
 *
 * Callers reach disassembly from three places: raw bytes, the result of a
 * previous read they do not want to repeat, and a decoder they already hold
 * from an emitter. All three are accepted so the listing never costs a second
 * decode.
 *
 * @param {Uint8Array|ArrayBuffer|Buffer|DataView|object} input Bytes or record.
 * @param {object} options Format values for the byte path.
 * @returns {object} Record carrying an `instructions` array.
 */
function resolveDecoderRecord(input, options) {
  if (input && typeof input === "object" && Array.isArray(input.instructions)) {
    return input;
  }
  if (input && typeof input === "object" && input.decoder) {
    return input.decoder;
  }
  const result = readWithValues(input, normalizeValues(DEFAULT_VALUES, {
    ...options,
    emit: OUTPUT_RAW,
    decodeInstructions: true
  }, FORMAT_NAME));
  return result.decoder;
}

/**
 * CarbonEngineJS-facing DXBC (Direct3D shader bytecode) reader.
 *
 * The Cjs prefix marks this as a JavaScript format/construction boundary.
 * DXBC is Microsoft's compiled-shader container format; this reader has no
 * CCP/Carbon vocabulary. It parses the container, signatures and the
 * SM4/SM5 token stream, and emits plain JSON data by default or the raw
 * decoder objects for backends (GLSL/WGSL emitters) that want them.
 */
class CjsDxbcFormat {
  #emit = DEFAULT_VALUES.emit;
  #source = DEFAULT_VALUES.source;
  #decodeInstructions = DEFAULT_VALUES.decodeInstructions;

  /**
   * Create a reusable format profile.
   *
   * @param {object} [options] Default format values.
   */
  constructor(options = {}) {
    this.SetValues(options);
  }

  /**
   * Set format values for this reusable profile.
   *
   * @param {object} [options] Values to merge into the profile.
   * @returns {CjsDxbcFormat} This format profile.
   */
  SetValues(options = {}) {
    const values = normalizeValues(this.GetValues(), options, FORMAT_NAME);
    this.#emit = values.emit;
    this.#source = values.source;
    this.#decodeInstructions = values.decodeInstructions;
    return this;
  }

  /**
   * Get this profile's current values, optionally with per-call overrides.
   *
   * @param {object} [options] Optional values to merge into a copy.
   * @returns {object} A copy of the effective values.
   */
  GetValues(options = {}) {
    return normalizeValues({
      emit: this.#emit,
      source: this.#source,
      decodeInstructions: this.#decodeInstructions
    }, options, FORMAT_NAME);
  }

  /**
   * Read a DXBC payload with this profile's values.
   *
   * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input DXBC bytes.
   * @param {object} [options] Per-call value overrides.
   * @returns {object} Plain JSON data, or raw decoder objects when emit is "raw".
   */
  Read(input, options = {}) {
    return readWithValues(input, this.GetValues(options));
  }

  /**
   * Inspect a DXBC payload without decoding instructions.
   *
   * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input DXBC bytes.
   * @param {object} [options] Per-call value overrides.
   * @returns {object} Plain summary data.
   */
  Inspect(input, options = {}) {
    return inspectWithValues(input, this.GetValues(options));
  }

  /**
   * Static payload sniff. Static methods use camelCase by convention.
   *
   * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input Candidate bytes.
   * @returns {boolean} True when the payload starts with the DXBC magic.
   */
  static isDxbc(input) {
    try {
      return DxbcContainer.IsDxbc(input);
    } catch {
      return false;
    }
  }

  /**
   * Static one-shot read.
   *
   * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input DXBC bytes.
   * @param {object} [options] Format values.
   * @returns {object} Plain JSON data, or raw decoder objects when emit is "raw".
   */
  static read(input, options = {}) {
    return readWithValues(input, normalizeValues(DEFAULT_VALUES, options, FORMAT_NAME));
  }

  /**
   * Static one-shot inspection.
   *
   * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input DXBC bytes.
   * @param {object} [options] Format values.
   * @returns {object} Plain summary data.
   */
  static inspect(input, options = {}) {
    return inspectWithValues(input, normalizeValues(DEFAULT_VALUES, options, FORMAT_NAME));
  }

  /**
   * Static one-shot disassembly.
   *
   * A translated shader can only be judged against the bytecode it was
   * translated from, so the listing exists to be read beside emitted GLSL or
   * WGSL. Accepts DXBC bytes or an already-decoded result from `read`.
   *
   * @param {Uint8Array|ArrayBuffer|Buffer|DataView|object} input DXBC bytes,
   *     a read result, or a decoder record.
   * @param {object} [options] Listing options plus format values.
   * @returns {string} Assembly listing.
   */
  static disassemble(input, options = {}) {
    const decoder = resolveDecoderRecord(input, options);
    return disassembleInstructions(decoder, options);
  }

  /**
   * Static JSON-compatible conversion.
   *
   * @param {any} value Format output to convert.
   * @returns {any} Plain JSON-compatible data.
   */
  static toJSON(value) {
    return toJsonValue(value);
  }
  static OUTPUT_JSON = OUTPUT_JSON;
  static OUTPUT_RAW = OUTPUT_RAW;
  static type = Object.freeze(["shader"]);
  static mediaTypes = Object.freeze(["shader"]);
  static inputTypes = Object.freeze(["dxbc"]);
  static outputTypes = Object.freeze([OUTPUT_JSON]);
  static debugOutputTypes = Object.freeze([OUTPUT_RAW]);
}

export { CjsDxbcFormat, CjsDxbcFormat as default };
//# sourceMappingURL=CjsDxbcFormat.js.map
