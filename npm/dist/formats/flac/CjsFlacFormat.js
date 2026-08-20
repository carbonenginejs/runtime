import { DEFAULT_VALUES, normalizeValues, readWithValues, inspectWithValues, isSupportedWithValues, toJsonValue, isFLAC, toBytes, OUTPUT_JSON, OUTPUT_PCM, OUTPUT_RAW } from './core/helpers.js';

const FORMAT_NAME = "CjsFlacFormat";

/**
 * Metadata-only FLAC format profile that validates the stream signature,
 * inspects stream metadata, and emits raw container bytes or debug JSON
 * without decoding PCM.
 */
class CjsFlacFormat {
  #values = DEFAULT_VALUES;

  /** Creates a CjsFlacFormat with caller-provided reader configuration. */
  constructor(options = {}) {
    this.SetValues(options);
  }

  /**
   * Applies caller-provided options after normalizing supported fields for the
   * FLAC format configuration.
   */
  SetValues(options = {}) {
    this.#values = normalizeValues(this.#values, {
      inputType: "flac",
      ...options
    }, FORMAT_NAME);
    return this;
  }

  /**
   * Returns a snapshot of the normalized reader options for the FLAC format
   * configuration.
   */
  GetValues(options = {}) {
    return normalizeValues(this.#values, {
      inputType: "flac",
      ...options
    }, FORMAT_NAME);
  }

  /**
   * Reads the primary public payload representation from the supplied input
   * for the FLAC format configuration.
   */
  Read(input, options = {}) {
    return readWithValues(input, this.GetValues(options));
  }

  /**
   * Reads the primary public payload representation asynchronously for the
   * FLAC format configuration.
   */
  async ReadAsync(input, options = {}) {
    return this.Read(input, options);
  }

  /**
   * Returns structural metadata without materializing the decoded payload for
   * the FLAC format configuration.
   */
  Inspect(input, options = {}) {
    return inspectWithValues(input, this.GetValues(options));
  }

  /**
   * Reports whether input meets the active decoder capability constraints for
   * the FLAC format configuration.
   */
  IsSupported(input, options = {}) {
    return isSupportedWithValues(input, this.GetValues(options));
  }

  /**
   * Converts the current decoded payload into a JSON-safe representation for
   * the FLAC format configuration.
   */
  ToJSON(value) {
    return toJsonValue(value);
  }

  /** Provides the one-shot FLAC payload reader entry point. */
  static read(input, options = {}) {
    return readWithValues(input, normalizeValues(DEFAULT_VALUES, {
      inputType: "flac",
      ...options
    }, FORMAT_NAME));
  }

  /** Provides the asynchronous one-shot FLAC payload reader entry point. */
  static async readAsync(input, options = {}) {
    return CjsFlacFormat.read(input, options);
  }

  /** Provides the one-shot FLAC metadata inspection entry point. */
  static inspect(input, options = {}) {
    return inspectWithValues(input, normalizeValues(DEFAULT_VALUES, {
      inputType: "flac",
      ...options
    }, FORMAT_NAME));
  }

  /** Checks one input against the FLAC decoder capability contract. */
  static isSupported(input, options = {}) {
    return isSupportedWithValues(input, normalizeValues(DEFAULT_VALUES, {
      inputType: "flac",
      ...options
    }, FORMAT_NAME));
  }

  /** Provides the one-shot FLAC JSON conversion entry point. */
  static toJSON(value) {
    return toJsonValue(value);
  }

  /** Checks whether caller-provided bytes carry the expected FLAC signature. */
  static isFLAC(input) {
    try {
      return isFLAC(toBytes(input));
    } catch {
      return false;
    }
  }

  /**
   * Emit targets for this format (canonical frozen enum).
   */
  static Output = Object.freeze({
    RAW: OUTPUT_RAW,
    PCM: OUTPUT_PCM,
    JSON: OUTPUT_JSON
  });
  static OUTPUT_FLAC_JSON = "flacJson";
  static type = Object.freeze(["audio"]);
  static mediaTypes = Object.freeze(["audio"]);
  static extensions = Object.freeze([".flac"]);
  static inputTypes = Object.freeze(["flac"]);
  static outputTypes = Object.freeze([]);
  static debugOutputTypes = Object.freeze(["flacJson", OUTPUT_RAW]);
  static implementationStatus = "metadata-only";
}

export { CjsFlacFormat };
//# sourceMappingURL=CjsFlacFormat.js.map
