import { DEFAULT_VALUES, normalizeValues, readWithValues, inspectWithValues, isSupportedWithValues, toJsonValue, isWAV, toBytes, OUTPUT_AUDIO, OUTPUT_PCM, OUTPUT_RAW, OUTPUT_JSON } from './core/helpers.js';

const FORMAT_NAME = "CjsWavFormat";
class CjsWavFormat {
  #values = DEFAULT_VALUES;

  /**
   * Create a reusable WAV format profile.
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
   * @returns {CjsWavFormat} This format profile.
   */
  SetValues(options = {}) {
    this.#values = normalizeValues(this.#values, {
      inputType: "wav",
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
      inputType: "wav",
      ...options
    }, FORMAT_NAME);
  }

  /**
   * Read WAV bytes with this profile.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input WAV bytes.
   * @param {object} [options] Per-call values.
   * @returns {object} GPU-free raw/debug/PCM payload for the selected emit target.
   */
  Read(input, options = {}) {
    return readWithValues(input, this.GetValues(options), "wav");
  }

  /**
   * Read WAV bytes asynchronously with this profile.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input WAV bytes.
   * @param {object} [options] Per-call values.
   * @returns {Promise<object>} GPU-free raw/debug/PCM payload for the selected emit target.
   */
  async ReadAsync(input, options = {}) {
    return this.Read(input, options);
  }

  /**
   * Inspect WAV bytes without decoding sample data.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input WAV bytes.
   * @param {object} [options] Per-call values.
   * @returns {object} RIFF/WAVE metadata.
   */
  Inspect(input, options = {}) {
    return inspectWithValues(input, this.GetValues(options), "wav");
  }

  /**
   * Report whether WAV input and requested output variants are supported.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input WAV bytes.
   * @param {object} [options] Per-call values.
   * @returns {object} Support/probe report.
   */
  IsSupported(input, options = {}) {
    return isSupportedWithValues(input, this.GetValues(options), "wav");
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
   * One-shot WAV read.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input WAV bytes.
   * @param {object} [options] Read options.
   * @returns {object} GPU-free raw/debug/PCM payload for the selected emit target.
   */
  static read(input, options = {}) {
    return readWithValues(input, normalizeValues(DEFAULT_VALUES, {
      inputType: "wav",
      ...options
    }, FORMAT_NAME), "wav");
  }

  /**
   * One-shot asynchronous WAV read.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input WAV bytes.
   * @param {object} [options] Read options.
   * @returns {Promise<object>} GPU-free raw/debug/PCM payload for the selected emit target.
   */
  static async readAsync(input, options = {}) {
    return CjsWavFormat.read(input, options);
  }

  /**
   * One-shot WAV inspection.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input WAV bytes.
   * @param {object} [options] Inspect options.
   * @returns {object} RIFF/WAVE metadata.
   */
  static inspect(input, options = {}) {
    return inspectWithValues(input, normalizeValues(DEFAULT_VALUES, {
      inputType: "wav",
      ...options
    }, FORMAT_NAME), "wav");
  }

  /**
   * One-shot WAV support probe.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input WAV bytes.
   * @param {object} [options] Probe options.
   * @returns {object} Support/probe report.
   */
  static isSupported(input, options = {}) {
    return isSupportedWithValues(input, normalizeValues(DEFAULT_VALUES, {
      inputType: "wav",
      ...options
    }, FORMAT_NAME), "wav");
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
   * Test whether bytes look like a WAV file.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input Candidate WAV bytes.
   * @returns {boolean} True when RIFF/WAVE signatures are present.
   */
  static isWAV(input) {
    try {
      return isWAV(toBytes(input));
    } catch {
      return false;
    }
  }
  static OUTPUT_AUDIO = OUTPUT_AUDIO;
  static OUTPUT_PCM = OUTPUT_PCM;
  static OUTPUT_RAW = OUTPUT_RAW;
  static OUTPUT_JSON = OUTPUT_JSON;
  static OUTPUT_WAV_JSON = "wavJson";
  static type = Object.freeze(["audio"]);
  static mediaTypes = Object.freeze(["audio"]);
  static inputTypes = Object.freeze(["wav"]);
  static outputTypes = Object.freeze([OUTPUT_AUDIO, OUTPUT_PCM]);
  static debugOutputTypes = Object.freeze(["wavJson", OUTPUT_RAW]);
}

export { CjsWavFormat };
//# sourceMappingURL=CjsWavFormat.js.map
