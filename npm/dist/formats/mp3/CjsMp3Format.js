import { DEFAULT_VALUES, normalizeValues, readWithValues, inspectWithValues, isSupportedWithValues, toJsonValue, isMP3, toBytes, OUTPUT_JSON, OUTPUT_RAW, OUTPUT_PCM, OUTPUT_AUDIO } from './core/helpers.js';

const FORMAT_NAME = "CjsMp3Format";

/**
 * MP3 audio format profile that inspects frame and tag metadata and emits
 * raw container bytes or debug JSON, with PCM decoding not implemented.
 */
class CjsMp3Format {
  #values = DEFAULT_VALUES;

  /**
   * Create a reusable MP3 format profile.
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
   * @returns {CjsMp3Format} This format profile.
   */
  SetValues(options = {}) {
    this.#values = normalizeValues(this.#values, {
      inputType: "mp3",
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
      inputType: "mp3",
      ...options
    }, FORMAT_NAME);
  }

  /**
   * Read MP3 bytes with this profile.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input MP3 bytes.
   * @param {object} [options] Per-call values.
   * @returns {object} GPU-free raw/debug payload for the selected emit target.
   */
  Read(input, options = {}) {
    return readWithValues(input, this.GetValues(options), "mp3");
  }

  /**
   * Read MP3 bytes asynchronously with this profile.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input MP3 bytes.
   * @param {object} [options] Per-call values.
   * @returns {Promise<object>} GPU-free raw/debug payload for the selected emit target.
   */
  async ReadAsync(input, options = {}) {
    return this.Read(input, options);
  }

  /**
   * Inspect MP3 bytes without decoding audio frames.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input MP3 bytes.
   * @param {object} [options] Per-call values.
   * @returns {object} MP3 header metadata.
   */
  Inspect(input, options = {}) {
    return inspectWithValues(input, this.GetValues(options), "mp3");
  }

  /**
   * Report whether MP3 input and requested output variants are supported.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input MP3 bytes.
   * @param {object} [options] Per-call values.
   * @returns {object} Support/probe report.
   */
  IsSupported(input, options = {}) {
    return isSupportedWithValues(input, this.GetValues(options), "mp3");
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
   * One-shot MP3 read.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input MP3 bytes.
   * @param {object} [options] Read options.
   * @returns {object} GPU-free raw/debug payload for the selected emit target.
   */
  static read(input, options = {}) {
    return readWithValues(input, normalizeValues(DEFAULT_VALUES, {
      inputType: "mp3",
      ...options
    }, FORMAT_NAME), "mp3");
  }

  /**
   * One-shot asynchronous MP3 read.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input MP3 bytes.
   * @param {object} [options] Read options.
   * @returns {Promise<object>} GPU-free raw/debug payload for the selected emit target.
   */
  static async readAsync(input, options = {}) {
    return CjsMp3Format.read(input, options);
  }

  /**
   * One-shot MP3 inspection.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input MP3 bytes.
   * @param {object} [options] Inspect options.
   * @returns {object} MP3 header metadata.
   */
  static inspect(input, options = {}) {
    return inspectWithValues(input, normalizeValues(DEFAULT_VALUES, {
      inputType: "mp3",
      ...options
    }, FORMAT_NAME), "mp3");
  }

  /**
   * One-shot MP3 support probe.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input MP3 bytes.
   * @param {object} [options] Probe options.
   * @returns {object} Support/probe report.
   */
  static isSupported(input, options = {}) {
    return isSupportedWithValues(input, normalizeValues(DEFAULT_VALUES, {
      inputType: "mp3",
      ...options
    }, FORMAT_NAME), "mp3");
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
   * Test whether bytes look like an MP3 file.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input Candidate MP3 bytes.
   * @returns {boolean} True when ID3 or MPEG frame sync is present.
   */
  static isMP3(input) {
    try {
      return isMP3(toBytes(input));
    } catch {
      return false;
    }
  }

  /**
   * Emit targets for this format (canonical frozen enum).
   */
  static Output = Object.freeze({
    AUDIO: OUTPUT_AUDIO,
    PCM: OUTPUT_PCM,
    RAW: OUTPUT_RAW,
    JSON: OUTPUT_JSON
  });
  static OUTPUT_MP3_JSON = "mp3Json";
  static type = Object.freeze(["audio"]);
  static mediaTypes = Object.freeze(["audio"]);
  static extensions = Object.freeze([".mp3"]);
  static inputTypes = Object.freeze(["mp3"]);
  static outputTypes = Object.freeze([]);
  static debugOutputTypes = Object.freeze(["mp3Json", OUTPUT_RAW]);
}

export { CjsMp3Format };
//# sourceMappingURL=CjsMp3Format.js.map
