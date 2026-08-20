import { CjsYamlReader } from './core/CjsYamlReader.js';
import { DEFAULT_VALUES, normalizeValues, toJsonGraph, OUTPUT_RAW, OUTPUT_DOCUMENT, OUTPUT_PAYLOAD, OUTPUT_JSON, TAG_PRESERVE, TAG_REJECT, TAG_HANDLE } from './core/helpers.js';

const FORMAT_NAME = "CjsYamlFormat";

/**
 * YAML format profile that parses YAML text or strict UTF-8 bytes into payload,
 * JSON-graph, raw, or document output with configurable tag policies, alias
 * limits, and identity/reference markers.
 */
class CjsYamlFormat {
  #values = DEFAULT_VALUES;

  /** Creates a CjsYamlFormat with caller-provided reader configuration. */
  constructor(options = {}) {
    this.SetValues(options);
  }

  /**
   * Applies caller-provided options after normalizing supported fields for the
   * YAML document reader.
   */
  SetValues(options = {}) {
    this.#values = normalizeValues(this.#values, options, FORMAT_NAME);
    return this;
  }

  /**
   * Returns a snapshot of the normalized reader options for the YAML document
   * reader.
   */
  GetValues(options = {}) {
    return normalizeValues(this.#values, options, FORMAT_NAME);
  }

  /**
   * Reads the primary public payload representation from the supplied input
   * for the YAML document reader.
   */
  Read(input, options = {}) {
    return CjsYamlFormat.read(input, this.GetValues(options));
  }

  /** Reads payload from the current YAML document reader. */
  ReadPayload(input, options = {}) {
    return CjsYamlFormat.readPayload(input, this.GetValues(options));
  }

  /** Reads raw from the current YAML document reader. */
  ReadRaw(input, options = {}) {
    return CjsYamlFormat.readRaw(input, this.GetValues(options));
  }

  /** Reads document from the current YAML document reader. */
  ReadDocument(input, options = {}) {
    return CjsYamlFormat.readDocument(input, this.GetValues(options));
  }

  /**
   * Returns structural metadata without materializing the decoded payload for
   * the YAML document reader.
   */
  Inspect(input, options = {}) {
    return CjsYamlFormat.inspect(input, this.GetValues(options));
  }

  /**
   * Converts the current decoded payload into a JSON-safe representation for
   * the YAML document reader.
   */
  ToJSON(value, options = {}) {
    return toJsonGraph(value, this.GetValues(options));
  }

  /** Provides the one-shot YAML payload reader entry point. */
  static read(input, options = {}) {
    const values = normalizeValues(DEFAULT_VALUES, options, FORMAT_NAME);
    if (values.emit === OUTPUT_RAW) return new CjsYamlReader(input, values).ReadRaw();
    if (values.emit === OUTPUT_DOCUMENT) return new CjsYamlReader(input, values).ReadDocument();
    return new CjsYamlReader(input, values).ReadPayload();
  }

  /** Provides the one-shot YAML normalized-payload reader entry point. */
  static readPayload(input, options = {}) {
    const values = normalizeValues(DEFAULT_VALUES, options, FORMAT_NAME);
    return new CjsYamlReader(input, values).ReadPayload();
  }

  /** Provides the one-shot YAML raw-value reader entry point. */
  static readRaw(input, options = {}) {
    const values = normalizeValues(DEFAULT_VALUES, options, FORMAT_NAME);
    return new CjsYamlReader(input, values).ReadRaw();
  }

  /** Provides the one-shot YAML document reader entry point. */
  static readDocument(input, options = {}) {
    const values = normalizeValues(DEFAULT_VALUES, options, FORMAT_NAME);
    return new CjsYamlReader(input, values).ReadDocument();
  }

  /** Provides the one-shot YAML metadata inspection entry point. */
  static inspect(input, options = {}) {
    const values = normalizeValues(DEFAULT_VALUES, options, FORMAT_NAME);
    return new CjsYamlReader(input, values).Inspect();
  }

  /** Provides the one-shot YAML JSON conversion entry point. */
  static toJSON(value, options = {}) {
    return toJsonGraph(value, normalizeValues(DEFAULT_VALUES, options, FORMAT_NAME));
  }

  /**
   * Emit targets for this format (canonical frozen enum).
   */
  static Output = Object.freeze({
    JSON: OUTPUT_JSON,
    PAYLOAD: OUTPUT_PAYLOAD,
    RAW: OUTPUT_RAW,
    DOCUMENT: OUTPUT_DOCUMENT
  });
  static TAG_PRESERVE = TAG_PRESERVE;
  static TAG_REJECT = TAG_REJECT;
  static TAG_HANDLE = TAG_HANDLE;
  static id = "yaml";
  static extensions = Object.freeze([".yaml", ".yml"]);
  static type = Object.freeze(["data"]);
  static mediaTypes = Object.freeze(["data"]);
  static inputTypes = Object.freeze(["yaml"]);
  static outputTypes = Object.freeze([OUTPUT_JSON, OUTPUT_PAYLOAD]);
  static debugOutputTypes = Object.freeze([OUTPUT_RAW, OUTPUT_DOCUMENT]);
}

export { CjsYamlFormat, CjsYamlFormat as default };
//# sourceMappingURL=CjsYamlFormat.js.map
