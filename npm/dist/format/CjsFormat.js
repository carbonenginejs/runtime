import { CjsResourceProbe as _CjsResourceProbe } from './CjsResourceProbe.js';

class CjsFormat {
  options = {};

  /**
   * Convenience factory for simple format helpers.
   * Keep this lightweight so format classes can stay pure-reader implementations.
   *
   * @param {*} input
   * @param {object} options
   * @returns {Promise<*>|*}
   */
  static read(input, options = null) {
    const reader = new this(options || {});
    return reader.Read(input, options || {});
  }

  /**
   * Async convenience factory for format readers.
   *
   * @param {*} input
   * @param {object} options
   * @returns {Promise<*>}
   */
  static async readAsync(input, options = null) {
    const reader = new this(options || {});
    return reader.ReadAsync(input, options || {});
  }

  /**
   * Canonical support probe entrypoint.
   * Returns a probe report including compressed/raw capability variants when implemented.
   *
   * @param {*} input
   * @param {object} options
   * @returns {CjsResourceProbe}
   */
  static isSupported(input, options = null) {
    const source = typeof input === "string" ? "path" : "buffer";
    const formatName = this.name ? this.name.replace(/^Cjs/u, "").replace(/Format$/u, "").toLowerCase() : "format";
    return _CjsResourceProbe.createUnsupported(formatName, "No probe implementation.", {
      source,
      ...options
    });
  }

  /**
   * Alias for canonical naming.
   *
   * @param {*} input
   * @param {object} options
   * @returns {CjsResourceProbe}
   */
  static inspect(input, options = null) {
    return this.isSupported(input, options);
  }

  /**
   * Content-verified type/route resolution (kb §5, optional per format).
   *
   * Where inspect()/isSupported() report what the container CLAIMS,
   * resolveType() performs one bounded asynchronous content check (magic, a
   * first frame/block, a setup header) and reports what the reader has
   * evidence it can actually decode. Overrides return a CjsResourceProbe
   * with `verified: true` and declared/resolved/mismatch evidence in
   * `metadata`; `preferred` names the resolved decode route. A caller-forced
   * emit always wins over a resolution, and this base implementation - the
   * zero-extra-work path for formats without an override - delegates to
   * isSupported() with `verified` false so an unverified result never
   * changes a route.
   *
   * @param {*} input Bytes (or path where the format supports it).
   * @param {object|null} options Format options.
   * @returns {Promise<CjsResourceProbe>} Probe report; content-verified only when overridden.
   */
  static async resolveType(input, options = null) {
    const report = _CjsResourceProbe.from(this.isSupported(input, options));
    report.verified = false;
    return report;
  }
  constructor(options = null) {
    this.options = {
      ...(options || {})
    };
  }
  SetValues(values = null) {
    if (!values || typeof values !== "object") {
      return this;
    }
    if (Object.prototype.hasOwnProperty.call(values, "options")) {
      this.options = {
        ...(values.options || {})
      };
    } else {
      this.options = {
        ...this.options,
        ...values
      };
    }
    return this;
  }
  GetValues() {
    return {
      options: {
        ...this.options
      }
    };
  }
  Initialize(values = null) {
    return this.SetValues(values || {});
  }

  /**
   * Primary instance read entrypoint for synchronous readers.
   * Implementations may override with async handling in readAsync only if needed.
   */
  Read(input, options = null) {
    throw new Error(`${this.constructor.name}.Read must be implemented by a format package.`);
  }

  /**
   * Primary async read entrypoint for asynchronous readers.
   * Defaults to sync Read for compatibility.
   */
  async ReadAsync(input, options = null) {
    return this.Read(input, options);
  }

  /**
   * Canonical package-family group names.
   */
  static Type = Object.freeze({
    AUDIO: "audio",
    DATA: "data",
    GEOMETRY: "geometry",
    IMAGE: "image",
    SCHEMA: "schema",
    SHADER: "shader",
    TEXTURE: "texture",
    VIDEO: "video"
  });

  /**
   * Canonical media-type groups used by format registration.
   */
  static MediaType = Object.freeze({
    AUDIO: "audio",
    DATA: "data",
    GEOMETRY: "geometry",
    IMAGE: "image",
    SHADER: "shader",
    SCHEMA: "schema",
    TEXTURE: "texture",
    VIDEO: "video"
  });

  /**
   * Canonical output-type tokens used by format emit contracts.
   */
  static OutputType = Object.freeze({
    AUDIO: "audio",
    CMF: "cmf",
    GR2: "gr2",
    IMAGE: "image",
    JSON: "json",
    PCM: "pcm",
    RAW: "raw",
    RGBA: "rgba",
    SCHEMA: "schema",
    SHADER: "shader",
    SHARED: "shared",
    TEXTURE: "texture",
    VIDEO: "video",
    OBJ_JSON: "objJson"
  });
  static type = Object.freeze([]);
  static mediaTypes = Object.freeze([]);
  static inputTypes = Object.freeze([]);
  static outputTypes = Object.freeze([]);
  static debugOutputTypes = Object.freeze(["json", "raw"]);
}

/**
 * Shared utility for asserting required format metadata exists.
 */
function ValidateFormatContract(Constructor) {
  if (!Constructor) {
    throw new TypeError("ValidateFormatContract requires a format class.");
  }
  const hasOutput = Array.isArray(Constructor.outputTypes) && Constructor.outputTypes.length > 0;
  const hasInput = Array.isArray(Constructor.inputTypes) && Constructor.inputTypes.length > 0;
  const hasMedia = Array.isArray(Constructor.mediaTypes) && Constructor.mediaTypes.length > 0;
  const hasType = Array.isArray(Constructor.type) && Constructor.type.length > 0;
  const hasDebug = Array.isArray(Constructor.debugOutputTypes) && Constructor.debugOutputTypes.length > 0;
  if (!hasType || !hasMedia || !hasInput || !hasOutput || !hasDebug) {
    throw new TypeError(`Format contract missing metadata: type:${hasType} mediaTypes:${hasMedia} inputTypes:${hasInput} outputTypes:${hasOutput} debugOutputTypes:${hasDebug}`);
  }
}

export { CjsFormat, ValidateFormatContract };
//# sourceMappingURL=CjsFormat.js.map
