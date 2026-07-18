import { DEFAULT_VALUES, normalizeValues, readWithValues, inspectWithValues, isSupportedWithValues, toJsonValue, isWebM, toBytes, OUTPUT_JSON, OUTPUT_RAW, OUTPUT_VIDEO } from './core/helpers.js';

const FORMAT_NAME = "CjsWebmFormat";
class CjsWebmFormat {
  #values = DEFAULT_VALUES;

  /**
   * Create a reusable WebM format profile.
   *
   * @param {object} [options] Default read/inspect options.
   */
  constructor(options = {}) {
    this.SetValues(options);
  }

  /**
   * Merge options into this profile.
   *
   * @param {object} [options] Values to merge.
   * @returns {CjsWebmFormat} This format profile.
   */
  SetValues(options = {}) {
    this.#values = normalizeValues(this.#values, {
      inputType: "webm",
      ...options
    }, FORMAT_NAME);
    return this;
  }

  /**
   * Get normalized profile values with optional per-call overrides.
   *
   * @param {object} [options] Per-call values.
   * @returns {object} Normalized read values.
   */
  GetValues(options = {}) {
    return normalizeValues(this.#values, {
      inputType: "webm",
      ...options
    }, FORMAT_NAME);
  }

  /**
   * Read WebM bytes with this profile.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input WebM bytes.
   * @param {object} [options] Per-call values.
   * @returns {object} GPU-free raw/debug payload for the selected emit target.
   */
  Read(input, options = {}) {
    return readWithValues(input, this.GetValues(options), "webm");
  }

  /**
   * Read WebM bytes asynchronously with this profile.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input WebM bytes.
   * @param {object} [options] Per-call values.
   * @returns {Promise<object>} GPU-free raw/debug payload for the selected emit target.
   */
  async ReadAsync(input, options = {}) {
    return this.Read(input, options);
  }

  /**
   * Inspect WebM bytes without decoding media samples.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input WebM bytes.
   * @param {object} [options] Per-call values.
   * @returns {object} WebM container metadata.
   */
  Inspect(input, options = {}) {
    return inspectWithValues(input, this.GetValues(options), "webm");
  }

  /**
   * Report whether WebM input and requested output variants are supported.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input WebM bytes.
   * @param {object} [options] Per-call values.
   * @returns {object} Support/probe report.
   */
  IsSupported(input, options = {}) {
    return isSupportedWithValues(input, this.GetValues(options), "webm");
  }

  /**
   * Convert format output into JSON-compatible debug data.
   *
   * @param {any} value Format output.
   * @returns {any} JSON-compatible value.
   */
  ToJSON(value) {
    return toJsonValue(value);
  }

  /**
   * One-shot WebM read.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input WebM bytes.
   * @param {object} [options] Read options.
   * @returns {object} GPU-free raw/debug payload for the selected emit target.
   */
  static read(input, options = {}) {
    return readWithValues(input, normalizeValues(DEFAULT_VALUES, {
      inputType: "webm",
      ...options
    }, FORMAT_NAME), "webm");
  }

  /**
   * One-shot asynchronous WebM read.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input WebM bytes.
   * @param {object} [options] Read options.
   * @returns {Promise<object>} GPU-free raw/debug payload for the selected emit target.
   */
  static async readAsync(input, options = {}) {
    return CjsWebmFormat.read(input, options);
  }

  /**
   * One-shot WebM inspection.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input WebM bytes.
   * @param {object} [options] Inspect options.
   * @returns {object} WebM container metadata.
   */
  static inspect(input, options = {}) {
    return inspectWithValues(input, normalizeValues(DEFAULT_VALUES, {
      inputType: "webm",
      ...options
    }, FORMAT_NAME), "webm");
  }

  /**
   * One-shot WebM support probe.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input WebM bytes.
   * @param {object} [options] Probe options.
   * @returns {object} Support/probe report.
   */
  static isSupported(input, options = {}) {
    return isSupportedWithValues(input, normalizeValues(DEFAULT_VALUES, {
      inputType: "webm",
      ...options
    }, FORMAT_NAME), "webm");
  }

  /**
   * Convert format output into JSON-compatible debug data.
   *
   * @param {any} value Format output.
   * @returns {any} JSON-compatible value.
   */
  static toJSON(value) {
    return toJsonValue(value);
  }

  /**
   * Test whether bytes look like a WebM file.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input Candidate WebM bytes.
   * @returns {boolean} True when the EBML signature is present.
   */
  static isWebM(input) {
    try {
      return isWebM(toBytes(input));
    } catch {
      return false;
    }
  }

  /**
   * Emit targets for this format (canonical frozen enum).
   */
  static Output = Object.freeze({
    VIDEO: OUTPUT_VIDEO,
    RAW: OUTPUT_RAW,
    JSON: OUTPUT_JSON
  });
  static OUTPUT_WEBM_JSON = "webmJson";
  static type = Object.freeze(["video"]);
  static mediaTypes = Object.freeze(["video"]);
  static inputTypes = Object.freeze(["webm"]);
  static outputTypes = Object.freeze([OUTPUT_VIDEO]);
  static debugOutputTypes = Object.freeze(["webmJson", OUTPUT_RAW]);
}

export { CjsWebmFormat };
//# sourceMappingURL=CjsWebmFormat.js.map
