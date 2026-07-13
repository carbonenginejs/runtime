import { CjsModel } from "@carbonenginejs/core-types/model";
import { io, type } from "@carbonenginejs/core-types/schema";

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
@type.define({ className: "CjsResourceProbe", family: "resource" })
export class CjsResourceProbe extends CjsModel
{
  @io.persist
  @type.string
  format = "";

  @io.persist
  @type.string
  source = "";

  @io.persist
  @type.string
  supported = "none";

  @io.persist
  @type.float64
  confidence = 0;

  @io.persist
  @type.string
  preferred = "";

  @io.persist
  @type.string
  reason = "";

  @io.persist
  @type.unknown
  metadata = null;

  @io.persist
  @type.unknown
  variant = {};

  @io.persist
  @type.list("unknown")
  variants = [];

  @io.persist
  @type.list("string")
  warnings = [];

  @io.persist
  @type.list("string")
  errors = [];

  constructor(values = null) {
    super();
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
    this.SetValues(values || {}, { skipEvents: true });
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
    return new CjsResourceProbe({
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
    return CjsResourceProbe.isSupported(src, options);
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
    return new CjsResourceProbe({
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
    const anySupported = normalizedVariants.some((entry) => entry && entry.supported === true);
    const normalized = normalizedVariants.map((entry) => CjsResourceProbe.normalizeVariant(entry));
    const preferred = options && options.preferred ? options.preferred : CjsResourceProbe.selectPreferred(normalized);

    return new CjsResourceProbe({
      format,
      source: options?.source || "",
      supported: anySupported ? "full" : normalizedVariants.length > 0 ? "partial" : "none",
      confidence: normalized.length > 0 && anySupported ? 1 : (normalized.length > 0 ? 0.5 : 0),
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
    if (input instanceof CjsResourceProbe) return input;
    if (!input) return CjsResourceProbe.createUnsupported("", "No probe input.");
    if (typeof input === "object" && typeof input.toJSON === "function") {
      return new CjsResourceProbe(CjsResourceProbe.normalizeReport(input.toJSON()));
    }
    if (typeof input === "object") return new CjsResourceProbe(CjsResourceProbe.normalizeReport(input));
    return CjsResourceProbe.createUnsupported("", "Invalid probe payload.");
  }

  /**
   * Normalize a plain probe report while preserving format-specific metadata.
   *
   * @param {object} input
   * @returns {object}
   */
  static normalizeReport(input) {
    const variants = Array.isArray(input.variants)
      ? input.variants.map((entry) => CjsResourceProbe.normalizeVariant(entry))
      : [];
    return {
      ...input,
      variant: input.variant ? CjsResourceProbe.normalizeVariant(input.variant) : variants[0] || {},
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
    const priority = [ "compressed", "texture", "rgba", "pcm", "raw", "container", "video", "audio" ];
    const preferred = priority
      .map((kind) => variants.find((variant) => variant.kind === kind && variant.supported))
      .find(Boolean) || variants.find((variant) => variant.supported);
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
    return this.variants.some((entry) => entry && [ "raw", "rgba" ].includes(entry.kind) && entry.supported);
  }

  /**
   * Returns true if compressed variant is supported.
   *
   * @returns {boolean}
   */
  canUseCompressed() {
    return this.variants.some((entry) => entry && entry.kind === "compressed" && entry.supported);
  }

  /**
   * Return true when a supported variant of the requested kind exists.
   *
   * @param {string} kind
   * @returns {boolean}
   */
  canUse(kind) {
    return this.variants.some((entry) => entry && entry.kind === kind && entry.supported);
  }
}
