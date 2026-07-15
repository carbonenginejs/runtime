import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/core-types/model';
import { io, type } from '@carbonenginejs/core-types/schema';

let _initClass, _init_format, _init_extra_format, _init_source, _init_extra_source, _init_supported, _init_extra_supported, _init_confidence, _init_extra_confidence, _init_preferred, _init_extra_preferred, _init_reason, _init_extra_reason, _init_metadata, _init_extra_metadata, _init_variant, _init_extra_variant, _init_variants, _init_extra_variants, _init_warnings, _init_extra_warnings, _init_errors, _init_extra_errors;

/**
 * Standard probe report for resource formats and a reusable base for format-specific probes.
 *
 * Instances can be built by:
 * - returning plain object JSON payloads from format packages, then converted with CjsResourceProbe.from(...)
 * - returning CjsResourceProbe instances directly
 *
 * A format can report multiple usable variants in one payload, such as a
 * native compressed texture and a decoded RGBA fallback, without deciding
 * which engine-gpu or media backend should use.
 */
let _CjsResourceProbe;
class CjsResourceProbe extends CjsModel {
  static {
    ({
      e: [_init_format, _init_extra_format, _init_source, _init_extra_source, _init_supported, _init_extra_supported, _init_confidence, _init_extra_confidence, _init_preferred, _init_extra_preferred, _init_reason, _init_extra_reason, _init_metadata, _init_extra_metadata, _init_variant, _init_extra_variant, _init_variants, _init_extra_variants, _init_warnings, _init_extra_warnings, _init_errors, _init_extra_errors],
      c: [_CjsResourceProbe, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsResourceProbe",
      family: "resource"
    })], [[[io, io.persist, type, type.string], 16, "format"], [[io, io.persist, type, type.string], 16, "source"], [[io, io.persist, type, type.string], 16, "supported"], [[io, io.persist, type, type.float64], 16, "confidence"], [[io, io.persist, type, type.string], 16, "preferred"], [[io, io.persist, type, type.string], 16, "reason"], [[io, io.persist, type, type.unknown], 16, "metadata"], [[io, io.persist, type, type.unknown], 16, "variant"], [[io, io.persist, void 0, type.list("unknown")], 16, "variants"], [[io, io.persist, void 0, type.list("string")], 16, "warnings"], [[io, io.persist, void 0, type.list("string")], 16, "errors"]], 0, void 0, CjsModel));
  }
  format = _init_format(this, "");
  source = (_init_extra_format(this), _init_source(this, ""));
  supported = (_init_extra_source(this), _init_supported(this, "none"));
  confidence = (_init_extra_supported(this), _init_confidence(this, 0));
  preferred = (_init_extra_confidence(this), _init_preferred(this, ""));
  reason = (_init_extra_preferred(this), _init_reason(this, ""));
  metadata = (_init_extra_reason(this), _init_metadata(this, null));
  variant = (_init_extra_metadata(this), _init_variant(this, {}));
  variants = (_init_extra_variant(this), _init_variants(this, []));
  warnings = (_init_extra_variants(this), _init_warnings(this, []));
  errors = (_init_extra_warnings(this), _init_errors(this, []));
  constructor(values = null) {
    super(), _init_extra_errors(this);
    this.SetValues(values || {}, {
      markDirty: false,
      skipUpdate: true,
      skipEvents: true
    });
  }

  /**
   * Initialize probe fields from a plain object payload.
   *
   * @param {object|null} values
   * @returns {CjsResourceProbe}
   */
  Initialize(values = null) {
    this.SetValues(values || {}, {
      skipEvents: true
    });
    return this;
  }

  /**
   * Lightweight probe entrypoint.
   * Format packages should override this or provide their own probe implementation.
   *
   * @param {*} src
   *   Raw source path or source payload passed by caller.
   * @param {object|null} options
   *   Optional metadata/control overrides.
   * @returns {CjsResourceProbe}
   */
  static isSupported(src, options = null) {
    return new _CjsResourceProbe({
      format: "",
      source: typeof src === "string" ? src : "buffer",
      supported: "none",
      confidence: 0,
      preferred: "",
      reason: "No probe provided.",
      metadata: null,
      variant: {},
      variants: [],
      warnings: [],
      errors: ["CjsResourceProbe has no built-in format detection."],
      ...options
    });
  }

  /**
   * Detailed probe with report-style metadata. Aliases isSupported() in this minimal base.
   *
   * @param {*} src
   * @param {object|null} options
   * @returns {CjsResourceProbe}
   */
  static inspect(src, options = null) {
    return _CjsResourceProbe.isSupported(src, options);
  }

  /**
   * Build a probe report representing explicit failure.
   *
   * @param {string} format
   * @param {string} reason
   * @param {object|null} options
   * @returns {CjsResourceProbe}
   */
  static createUnsupported(format, reason, options = null) {
    return new _CjsResourceProbe({
      format,
      supported: "none",
      confidence: 0,
      preferred: "",
      reason: reason || "Unsupported format.",
      variant: {},
      variants: [],
      warnings: [],
      errors: [reason],
      ...(options || {})
    });
  }

  /**
   * Build a probe report representing one or more variants.
   *
   * @param {string} format
   * @param {Array<Object>} variants
   * @param {object|null} options
   * @returns {CjsResourceProbe}
   */
  static createSupported(format, variants, options = null) {
    const normalizedVariants = Array.isArray(variants) ? variants : [];
    const anySupported = normalizedVariants.some(entry => entry && entry.supported === true);
    const normalized = normalizedVariants.map(entry => _CjsResourceProbe.normalizeVariant(entry));
    const preferred = options && options.preferred ? options.preferred : _CjsResourceProbe.selectPreferred(normalized);
    return new _CjsResourceProbe({
      format,
      source: options?.source || "",
      supported: anySupported ? "full" : normalizedVariants.length > 0 ? "partial" : "none",
      confidence: normalized.length > 0 && anySupported ? 1 : normalized.length > 0 ? 0.5 : 0,
      preferred,
      reason: options?.reason || (anySupported ? "Supported variant found." : "No variant supported."),
      metadata: options?.metadata || null,
      variant: normalized[0] || {},
      variants: normalized,
      warnings: Array.isArray(options?.warnings) ? options.warnings : [],
      errors: Array.isArray(options?.errors) ? options.errors : [],
      ...(options || {})
    });
  }

  /**
   * Normalize incoming report payloads into a standard CjsResourceProbe instance.
   *
   * @param {CjsResourceProbe|object|null} input
   * @returns {CjsResourceProbe}
   */
  static from(input) {
    if (input instanceof _CjsResourceProbe) return input;
    if (!input) return _CjsResourceProbe.createUnsupported("", "No probe input.");
    if (typeof input === "object" && typeof input.toJSON === "function") {
      return new _CjsResourceProbe(_CjsResourceProbe.normalizeReport(input.toJSON()));
    }
    if (typeof input === "object") return new _CjsResourceProbe(_CjsResourceProbe.normalizeReport(input));
    return _CjsResourceProbe.createUnsupported("", "Invalid probe payload.");
  }

  /**
   * Normalize a plain probe report while preserving format-specific metadata.
   *
   * @param {object} input
   * @returns {object}
   */
  static normalizeReport(input) {
    const variants = Array.isArray(input.variants) ? input.variants.map(entry => _CjsResourceProbe.normalizeVariant(entry)) : [];
    return {
      ...input,
      variant: input.variant ? _CjsResourceProbe.normalizeVariant(input.variant) : variants[0] || {},
      variants
    };
  }

  /**
   * Normalize variant objects so runtimes can evaluate capability uniformly.
   *
   * @param {object|any} input
   * @returns {{kind: string, payloadType: string, codec: string, format: string, supported: boolean, reason: string, meta: *}}
   */
  static normalizeVariant(input) {
    if (!input || typeof input !== "object") {
      return {
        kind: "raw",
        payloadType: "raw",
        codec: "",
        format: "",
        supported: false,
        reason: "Invalid variant payload.",
        meta: null
      };
    }
    const kind = input.kind || input.payloadType || "raw";
    return {
      ...input,
      kind,
      payloadType: input.payloadType || kind,
      codec: input.codec || "",
      format: input.format || "",
      supported: !!input.supported,
      reason: input.reason || "",
      meta: input.meta || null
    };
  }

  /**
   * Select best preferred variant from normalized variant list.
   *
   * @param {Array<Object>} variants
   * @returns {string}
   */
  static selectPreferred(variants) {
    if (!Array.isArray(variants) || variants.length < 1) return "";
    const priority = ["compressed", "texture", "rgba", "pcm", "raw", "container", "video", "audio"];
    const preferred = priority.map(kind => variants.find(variant => variant.kind === kind && variant.supported)).find(Boolean) || variants.find(variant => variant.supported);
    return preferred ? preferred.codec || preferred.payloadType || preferred.kind || "" : "";
  }

  /**
   * Returns true if any supported variant is available.
   *
   * @returns {boolean}
   */
  isSupported() {
    return this.supported === "full" || this.supported === "partial";
  }

  /**
   * Returns true if raw fallback variant is supported.
   *
   * @returns {boolean}
   */
  canUseRaw() {
    return this.variants.some(entry => entry && ["raw", "rgba"].includes(entry.kind) && entry.supported);
  }

  /**
   * Returns true if compressed variant is supported.
   *
   * @returns {boolean}
   */
  canUseCompressed() {
    return this.variants.some(entry => entry && entry.kind === "compressed" && entry.supported);
  }

  /**
   * Return true when a supported variant of the requested kind exists.
   *
   * @param {string} kind
   * @returns {boolean}
   */
  canUse(kind) {
    return this.variants.some(entry => entry && entry.kind === kind && entry.supported);
  }
  static {
    _initClass();
  }
}

export { _CjsResourceProbe as CjsResourceProbe };
//# sourceMappingURL=CjsResourceProbe.js.map
