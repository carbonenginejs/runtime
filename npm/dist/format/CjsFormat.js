import { MediaType, PayloadType } from '@carbonenginejs/runtime-utils/media';
import { CjsResourceProbe as _CjsResourceProbe } from './CjsResourceProbe.js';

/**
 * Base class for format readers that defines the static
 * `read`/`readAsync`/`isSupported`/`resolveType` contract and instance
 * option handling that concrete format packages implement.
 */
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
   * Content-verified type/route resolution (optional per format).
   * Contract: docs/concepts/format-type-resolution.md.
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

  /** Creates a CjsFormat with caller-provided reader configuration. */
  constructor(options = null) {
    this.options = {
      ...(options || {})
    };
  }

  /** Applies supported format options for the resource format configuration. */
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

  /**
   * Returns a copy of the current format options for the resource format
   * configuration.
   */
  GetValues() {
    return {
      options: {
        ...this.options
      }
    };
  }

  /**
   * Initializes the format with the supplied values and context for the resource
   * format configuration.
   */
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
   * Canonical package-family group names - the shared vocabulary object from
   * runtime-utils (kb: runtime-utils owns cross-package media vocabulary).
   * Same object identity as `@carbonenginejs/runtime-utils/media` MediaType,
   * so tokens can never drift between packages.
   */
  static Type = MediaType;

  /**
   * Canonical media-type groups used by format registration - the shared
   * runtime-utils MediaType object (see Type above).
   */
  static MediaType = MediaType;

  /**
   * Canonical output-type tokens used by format emit contracts. Shared
   * payload ROLES come from runtime-utils PayloadType; the remaining tokens
   * (cmf/gr2/json/pcm/rgba/shared/objJson) are format-emit names owned by
   * their formats and enumerated here for discoverability only.
   */
  static OutputType = Object.freeze({
    AUDIO: PayloadType.AUDIO,
    CMF: "cmf",
    GR2: "gr2",
    IMAGE: PayloadType.IMAGE,
    JSON: "json",
    PCM: "pcm",
    RAW: PayloadType.RAW,
    RGBA: "rgba",
    SCHEMA: PayloadType.SCHEMA,
    SHADER: PayloadType.SHADER,
    SHARED: "shared",
    TEXTURE: PayloadType.TEXTURE,
    VIDEO: PayloadType.VIDEO,
    OBJ_JSON: "objJson"
  });
  static type = Object.freeze([]);
  static mediaTypes = Object.freeze([]);
  static inputTypes = Object.freeze([]);
  static outputTypes = Object.freeze([]);
  static debugOutputTypes = Object.freeze(["json", "raw"]);

  /**
   * File extensions this format loads, leading dot included.
   *
   * A format that can be reached through a resource declares them here so the
   * resource's handler registry needs no parallel table. Seven formats already
   * did this independently — black, pickle, red, schemabound, sqlite, static,
   * yaml — and this only names the convention they share.
   *
   * Empty means "not reachable by extension". That is the honest answer for
   * `webgl`, `webgpu`, `dxbc` and `hlsl`, whose `inputTypes` are logical input
   * names rather than file suffixes; do not populate it to look complete.
   *
   * `inputTypes` is NOT a substitute. It is dotless, it is present on every
   * format, and for the four above it names something that is not an extension
   * at all.
   */
  static extensions = Object.freeze([]);

  /**
   * How this format wants its bytes delivered.
   *
   * A loader must know whether to hand over an `ArrayBuffer` or text without
   * knowing the format, which is the one fact it cannot derive. Text-capable
   * formats — gltf, obj, stl, yaml, hlsl — currently sniff `typeof input ===
   * "string"` inside their readers instead of declaring it, so the decision is
   * made twice and stated nowhere.
   *
   * `"arraybuffer"` is the default because it is what every transport already
   * hardcodes today.
   */
  static requestResponseType = "arraybuffer";

  /**
   * Optional browser-worker module declaration.
   *
   * Concrete formats opt in with their exact `import.meta.url`, export name,
   * and optional clone-safe output restrictions.
   */
  static worker = null;

  /**
   * Asserts that a format class declares the metadata required for
   * registration and routing.
   *
   * @param {typeof CjsFormat} Constructor
   * @returns {void}
   */
  static validateContract(Constructor) {
    if (!Constructor) {
      throw new TypeError("CjsFormat.validateContract requires a format class.");
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
}

export { CjsFormat };
//# sourceMappingURL=CjsFormat.js.map
