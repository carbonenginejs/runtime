import { DEFAULT_VALUES, normalizeValues, readWithValues, inspectWithValues, isSupportedWithValues, toJsonValue, isTGA, toBytes, OUTPUT_IMAGE, OUTPUT_RGBA, OUTPUT_RAW, OUTPUT_JSON } from './core/helpers.js';

const FORMAT_NAME = "CjsTgaFormat";
class CjsTgaFormat {
  #values = DEFAULT_VALUES;

  /**
   * Create a reusable TGA format profile.
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
   * @returns {CjsTgaFormat} This format profile.
   */
  SetValues(options = {}) {
    this.#values = normalizeValues(this.#values, {
      inputType: "tga",
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
      inputType: "tga",
      ...options
    }, FORMAT_NAME);
  }

  /**
   * Read TGA bytes with this profile.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input TGA bytes.
   * @param {object} [options] Per-call values.
   * @returns {object} GPU-free raw/debug/RGBA payload for the selected emit target.
   */
  Read(input, options = {}) {
    return readWithValues(input, this.GetValues(options), "tga");
  }

  /**
   * Read TGA bytes asynchronously with this profile.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input TGA bytes.
   * @param {object} [options] Per-call values.
   * @returns {Promise<object>} GPU-free raw/debug/RGBA payload for the selected emit target.
   */
  async ReadAsync(input, options = {}) {
    return this.Read(input, options);
  }

  /**
   * Inspect TGA bytes without decoding full image data.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input TGA bytes.
   * @param {object} [options] Per-call values.
   * @returns {object} TGA header metadata.
   */
  Inspect(input, options = {}) {
    return inspectWithValues(input, this.GetValues(options), "tga");
  }

  /**
   * Report whether TGA input and requested output variants are supported.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input TGA bytes.
   * @param {object} [options] Per-call values.
   * @returns {object} Support/probe report.
   */
  IsSupported(input, options = {}) {
    return isSupportedWithValues(input, this.GetValues(options), "tga");
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
   * One-shot TGA read.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input TGA bytes.
   * @param {object} [options] Read options.
   * @returns {object} GPU-free raw/debug/RGBA payload for the selected emit target.
   */
  static read(input, options = {}) {
    return readWithValues(input, normalizeValues(DEFAULT_VALUES, {
      inputType: "tga",
      ...options
    }, FORMAT_NAME), "tga");
  }

  /**
   * One-shot asynchronous TGA read.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input TGA bytes.
   * @param {object} [options] Read options.
   * @returns {Promise<object>} GPU-free raw/debug/RGBA payload for the selected emit target.
   */
  static async readAsync(input, options = {}) {
    return CjsTgaFormat.read(input, options);
  }

  /**
   * One-shot TGA inspection.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input TGA bytes.
   * @param {object} [options] Inspect options.
   * @returns {object} TGA header metadata.
   */
  static inspect(input, options = {}) {
    return inspectWithValues(input, normalizeValues(DEFAULT_VALUES, {
      inputType: "tga",
      ...options
    }, FORMAT_NAME), "tga");
  }

  /**
   * One-shot TGA support probe.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input TGA bytes.
   * @param {object} [options] Probe options.
   * @returns {object} Support/probe report.
   */
  static isSupported(input, options = {}) {
    return isSupportedWithValues(input, normalizeValues(DEFAULT_VALUES, {
      inputType: "tga",
      ...options
    }, FORMAT_NAME), "tga");
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
   * Test whether bytes look like a TGA file.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input Candidate TGA bytes.
   * @returns {boolean} True when the TGA header looks valid.
   */
  static isTGA(input) {
    try {
      return isTGA(toBytes(input));
    } catch {
      return false;
    }
  }
  static OUTPUT_IMAGE = OUTPUT_IMAGE;
  static OUTPUT_RGBA = OUTPUT_RGBA;
  static OUTPUT_RAW = OUTPUT_RAW;
  static OUTPUT_JSON = OUTPUT_JSON;
  static OUTPUT_TGA_JSON = "tgaJson";
  static type = Object.freeze(["image"]);
  static mediaTypes = Object.freeze(["image"]);
  static inputTypes = Object.freeze(["tga"]);
  static outputTypes = Object.freeze([OUTPUT_IMAGE, OUTPUT_RGBA]);
  static debugOutputTypes = Object.freeze(["tgaJson", OUTPUT_RAW]);
}

export { CjsTgaFormat };
//# sourceMappingURL=CjsTgaFormat.js.map
