import { DEFAULT_VALUES, normalizeValues, readWithValues, inspectWithValues, isSupportedWithValues, toJsonValue, isWebP, toBytes, OUTPUT_JSON, OUTPUT_RAW } from './core/helpers.js';

const FORMAT_NAME = "CjsWebpFormat";

/**
 * Metadata-only WebP format profile that inspects RIFF chunk headers and
 * emits raw container bytes or debug JSON without decoding pixels.
 */
class CjsWebpFormat {
  #values = DEFAULT_VALUES;

  /** Creates a CjsWebpFormat with caller-provided reader configuration. */
  constructor(options = {}) {
    this.SetValues(options);
  }

  /**
   * Applies caller-provided options after normalizing supported fields for the
   * WebP format configuration.
   */
  SetValues(options = {}) {
    this.#values = normalizeValues(this.#values, {
      inputType: "webp",
      ...options
    }, FORMAT_NAME);
    return this;
  }

  /**
   * Returns a snapshot of the normalized reader options for the WebP format
   * configuration.
   */
  GetValues(options = {}) {
    return normalizeValues(this.#values, {
      inputType: "webp",
      ...options
    }, FORMAT_NAME);
  }

  /**
   * Reads the primary public payload representation from the supplied input
   * for the WebP format configuration.
   */
  Read(input, options = {}) {
    return readWithValues(input, this.GetValues(options));
  }

  /**
   * Reads the primary public payload representation asynchronously for the
   * WebP format configuration.
   */
  async ReadAsync(input, options = {}) {
    return this.Read(input, options);
  }

  /**
   * Returns structural metadata without materializing the decoded payload for
   * the WebP format configuration.
   */
  Inspect(input, options = {}) {
    return inspectWithValues(input, this.GetValues(options));
  }

  /**
   * Reports whether input meets the active decoder capability constraints for
   * the WebP format configuration.
   */
  IsSupported(input, options = {}) {
    return isSupportedWithValues(input, this.GetValues(options));
  }

  /**
   * Converts the current decoded payload into a JSON-safe representation for
   * the WebP format configuration.
   */
  ToJSON(value) {
    return toJsonValue(value);
  }

  /** Provides the one-shot WebP payload reader entry point. */
  static read(input, options = {}) {
    return readWithValues(input, normalizeValues(DEFAULT_VALUES, {
      inputType: "webp",
      ...options
    }, FORMAT_NAME));
  }

  /** Provides the asynchronous one-shot WebP payload reader entry point. */
  static async readAsync(input, options = {}) {
    return CjsWebpFormat.read(input, options);
  }

  /** Provides the one-shot WebP metadata inspection entry point. */
  static inspect(input, options = {}) {
    return inspectWithValues(input, normalizeValues(DEFAULT_VALUES, {
      inputType: "webp",
      ...options
    }, FORMAT_NAME));
  }

  /** Checks one input against the WebP decoder capability contract. */
  static isSupported(input, options = {}) {
    return isSupportedWithValues(input, normalizeValues(DEFAULT_VALUES, {
      inputType: "webp",
      ...options
    }, FORMAT_NAME));
  }

  /** Provides the one-shot WebP JSON conversion entry point. */
  static toJSON(value) {
    return toJsonValue(value);
  }

  /** Checks whether caller-provided bytes carry the expected WebP signature. */
  static isWebP(input) {
    try {
      return isWebP(toBytes(input));
    } catch {
      return false;
    }
  }

  /**
   * Emit targets for this format (canonical frozen enum).
   */
  static Output = Object.freeze({
    RAW: OUTPUT_RAW,
    JSON: OUTPUT_JSON
  });
  static OUTPUT_WEBP_JSON = "webpJson";
  static type = Object.freeze(["image"]);
  static mediaTypes = Object.freeze(["image"]);
  static inputTypes = Object.freeze(["webp"]);
  static outputTypes = Object.freeze([]);
  static debugOutputTypes = Object.freeze(["webpJson", OUTPUT_RAW]);
  static implementationStatus = "metadata-only";
}

export { CjsWebpFormat };
//# sourceMappingURL=CjsWebpFormat.js.map
