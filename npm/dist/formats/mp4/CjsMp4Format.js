import { CjsFormat } from '../../format/CjsFormat.js';
import { DEFAULT_VALUES, normalizeValues, readWithValues, inspectWithValues, toJsonValue, probeSupportWithValues, isMP4, toBytes, OUTPUT_JSON, OUTPUT_RAW, OUTPUT_VIDEO } from './core/helpers.js';

const FORMAT_NAME = "CjsMp4Format";

/**
 * MP4 container format profile that inspects box and track structure and
 * emits raw bytes, debug JSON, or a container-only video payload with codec
 * and duration summaries but no frame decoding.
 */
class CjsMp4Format extends CjsFormat {
  #values = DEFAULT_VALUES;

  /**
   * Create a reusable MP4 format profile.
   *
   * @param {object} [options] Default read/inspect options.
   */
  constructor(options = {}) {
    super();
    this.SetValues(options);
  }

  /**
   * Merge options into this profile.
   *
   * @param {object} [options] Values to merge.
   * @returns {CjsMp4Format} This format profile.
   */
  SetValues(options = {}) {
    this.#values = normalizeValues(this.#values, {
      inputType: "mp4",
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
      inputType: "mp4",
      ...options
    }, FORMAT_NAME);
  }

  /**
   * Read MP4 bytes with this profile.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input MP4 bytes.
   * @param {object} [options] Per-call values.
   * @returns {object} GPU-free raw/debug payload for the selected emit target.
   */
  Read(input, options = {}) {
    return readWithValues(input, this.GetValues(options), "mp4");
  }

  /**
   * Read MP4 bytes asynchronously with this profile.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input MP4 bytes.
   * @param {object} [options] Per-call values.
   * @returns {Promise<object>} GPU-free raw/debug payload for the selected emit target.
   */
  async ReadAsync(input, options = {}) {
    return this.Read(input, options);
  }

  /**
   * Inspect MP4 bytes without decoding media samples.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input MP4 bytes.
   * @param {object} [options] Per-call values.
   * @returns {object} MP4 container metadata.
   */
  Inspect(input, options = {}) {
    return inspectWithValues(input, this.GetValues(options), "mp4");
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
   * One-shot MP4 read.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input MP4 bytes.
   * @param {object} [options] Read options.
   * @returns {object} GPU-free raw/debug payload for the selected emit target.
   */
  static read(input, options = {}) {
    return readWithValues(input, normalizeValues(DEFAULT_VALUES, {
      inputType: "mp4",
      ...options
    }, FORMAT_NAME), "mp4");
  }

  /**
   * One-shot asynchronous MP4 read.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input MP4 bytes.
   * @param {object} [options] Read options.
   * @returns {Promise<object>} GPU-free raw/debug payload for the selected emit target.
   */
  static async readAsync(input, options = {}) {
    return CjsMp4Format.read(input, options);
  }

  /**
   * One-shot MP4 inspection.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input MP4 bytes.
   * @param {object} [options] Inspect options.
   * @returns {object} MP4 container metadata.
   */
  static inspect(input, options = {}) {
    return inspectWithValues(input, normalizeValues(DEFAULT_VALUES, {
      inputType: "mp4",
      ...options
    }, FORMAT_NAME), "mp4");
  }

  /**
   * One-shot MP4 support probe.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input MP4 bytes.
   * @param {object} [options] Probe options.
   * @returns {object} Support/probe report.
   */
  static probeSupport(input, options = {}) {
    return probeSupportWithValues(input, normalizeValues(DEFAULT_VALUES, {
      inputType: "mp4",
      ...options
    }, FORMAT_NAME), "mp4");
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
   * Test whether bytes look like an MP4 file.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input Candidate MP4 bytes.
   * @returns {boolean} True when an MP4-compatible ftyp box is present.
   */
  static isMP4(input) {
    try {
      return isMP4(toBytes(input));
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
  static OUTPUT_MP4_JSON = "mp4Json";
  static id = "mp4";
  static mediaTypes = Object.freeze(["audio", "video"]);
  static outputs = CjsFormat.defineOutputs({
    video: {},
    mp4Json: {
      role: "debug",
      probes: ["mp4Json", "raw"]
    },
    raw: {
      role: "debug",
      default: true,
      passthrough: true
    }
  });
  static extensions = Object.freeze([".mp4", ".m4v", ".m4a"]);
}

export { CjsMp4Format };
//# sourceMappingURL=CjsMp4Format.js.map
