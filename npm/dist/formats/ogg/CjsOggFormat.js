import { DEFAULT_VALUES, normalizeValues, readWithValues, inspectWithValues, isSupportedWithValues, toJsonValue, isOGG, toBytes, OUTPUT_JSON, OUTPUT_RAW, OUTPUT_PCM, OUTPUT_AUDIO } from './core/helpers.js';

const FORMAT_NAME = "CjsOggFormat";

/**
 * Ogg container format profile that inspects page and stream metadata and
 * decodes Ogg Vorbis audio to PCM with the in-project pure-JS Vorbis
 * decoder, alongside raw and debug JSON output.
 */
class CjsOggFormat {
  #values = DEFAULT_VALUES;

  /** Creates a CjsOggFormat with caller-provided reader configuration. */
  constructor(options = {}) {
    this.SetValues(options);
  }

  /**
   * Applies caller-provided options after normalizing supported fields for the
   * Ogg format configuration.
   */
  SetValues(options = {}) {
    this.#values = normalizeValues(this.#values, {
      inputType: "ogg",
      ...options
    }, FORMAT_NAME);
    return this;
  }

  /**
   * Returns a snapshot of the normalized reader options for the Ogg format
   * configuration.
   */
  GetValues(options = {}) {
    return normalizeValues(this.#values, {
      inputType: "ogg",
      ...options
    }, FORMAT_NAME);
  }

  /**
   * Reads the primary public payload representation from the supplied input
   * for the Ogg format configuration.
   */
  Read(input, options = {}) {
    return readWithValues(input, this.GetValues(options));
  }

  /**
   * Reads the primary public payload representation asynchronously for the Ogg
   * format configuration.
   */
  async ReadAsync(input, options = {}) {
    return this.Read(input, options);
  }

  /**
   * Returns structural metadata without materializing the decoded payload for
   * the Ogg format configuration.
   */
  Inspect(input, options = {}) {
    return inspectWithValues(input, this.GetValues(options));
  }

  /**
   * Reports whether input meets the active decoder capability constraints for
   * the Ogg format configuration.
   */
  IsSupported(input, options = {}) {
    return isSupportedWithValues(input, this.GetValues(options));
  }

  /**
   * Converts the current decoded payload into a JSON-safe representation for
   * the Ogg format configuration.
   */
  ToJSON(value) {
    return toJsonValue(value);
  }

  /** Provides the one-shot Ogg payload reader entry point. */
  static read(input, options = {}) {
    return readWithValues(input, normalizeValues(DEFAULT_VALUES, {
      inputType: "ogg",
      ...options
    }, FORMAT_NAME));
  }

  /** Provides the asynchronous one-shot Ogg payload reader entry point. */
  static async readAsync(input, options = {}) {
    return CjsOggFormat.read(input, options);
  }

  /** Provides the one-shot Ogg metadata inspection entry point. */
  static inspect(input, options = {}) {
    return inspectWithValues(input, normalizeValues(DEFAULT_VALUES, {
      inputType: "ogg",
      ...options
    }, FORMAT_NAME));
  }

  /** Checks one input against the Ogg decoder capability contract. */
  static isSupported(input, options = {}) {
    return isSupportedWithValues(input, normalizeValues(DEFAULT_VALUES, {
      inputType: "ogg",
      ...options
    }, FORMAT_NAME));
  }

  /** Provides the one-shot Ogg JSON conversion entry point. */
  static toJSON(value) {
    return toJsonValue(value);
  }

  /** Checks whether caller-provided bytes carry the expected Ogg signature. */
  static isOGG(input) {
    try {
      return isOGG(toBytes(input));
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
  static OUTPUT_OGG_JSON = "oggJson";
  static OUTPUT_PCM = OUTPUT_PCM;
  static OUTPUT_AUDIO = OUTPUT_AUDIO;
  static type = Object.freeze(["audio", "video"]);
  static mediaTypes = Object.freeze(["audio", "video"]);
  static inputTypes = Object.freeze(["ogg", "oga", "ogv"]);
  static outputTypes = Object.freeze([OUTPUT_PCM, OUTPUT_AUDIO]);
  static debugOutputTypes = Object.freeze(["oggJson", OUTPUT_RAW]);
  static implementationStatus = "vorbis-pcm";
}

export { CjsOggFormat };
//# sourceMappingURL=CjsOggFormat.js.map
