import { MediaType, PayloadType } from "@carbonenginejs/runtime-utils/media";

const OUTPUT_ROLE_RUNTIME = "runtime";
const OUTPUT_ROLE_DEBUG = "debug";
const READ_MODE_SYNC = "sync";
const READ_MODE_ASYNC = "async";

/**
 * Decorator-free base for every concrete format facade.
 *
 * The format subpaths must remain directly importable from authored source, so
 * this base deliberately does not import the decorated CjsResourceProbe model.
 * Formats return plain support reports; CjsResourceProbe.from() is the optional
 * resource-layer normalization boundary.
 */
export class CjsFormat
{
  options = {};

  constructor(options = null)
  {
    this.options = { ...(options || {}) };
  }

  /** Apply caller-provided instance defaults. */
  SetValues(values = null)
  {
    this.options = { ...this.options, ...(values || {}) };
    return this;
  }

  /** Return caller-provided instance defaults. */
  GetValues()
  {
    return { ...this.options };
  }

  /** Read through the concrete instance implementation. */
  Read(_input, _options = null)
  {
    const error = new Error(`${this.constructor.name}.Read is not implemented.`);
    error.code = "CJS_FORMAT_READ_NOT_IMPLEMENTED";
    throw error;
  }

  /** Async instance read; synchronous readers inherit this exact fallback. */
  async ReadAsync(input, options = null)
  {
    return this.Read(input, options);
  }

  /** Inspect with the instance's normalized options when available. */
  Inspect(input, options = null)
  {
    const values = typeof this.GetValues === "function"
      ? this.GetValues(options || {})
      : options || {};
    return this.constructor.inspect(input, values);
  }

  /** Return the cheap, unverified support report for this instance profile. */
  GetSupport(input, options = null)
  {
    const values = typeof this.GetValues === "function"
      ? this.GetValues(options || {})
      : options || {};
    return this.constructor.getSupport(input, values);
  }

  /** Exercise one exact output through the real asynchronous read path. */
  VerifySupport(input, options = null)
  {
    const values = typeof this.GetValues === "function"
      ? this.GetValues(options || {})
      : options || {};
    return this.constructor.verifySupport(input, values);
  }

  /**
   * Static read boundary. Concrete formats normally override this; the base
   * fallback supports the few formats implemented only as instance readers.
   */
  static read(input, options = null)
  {
    const reader = new this(options || {});
    if (reader.Read === CjsFormat.prototype.Read)
    {
      const error = new Error(`${this.name}.read is not implemented.`);
      error.code = "CJS_FORMAT_READ_NOT_IMPLEMENTED";
      throw error;
    }
    return reader.Read(input, options || {});
  }

  /** Async read boundary used by support verification and resource loading. */
  static async readAsync(input, options = null)
  {
    if (Object.hasOwn(this, "read")) return this.read(input, options || {});
    const reader = new this(options || {});
    return reader.ReadAsync(input, options || {});
  }

  /**
   * Synchronous structural metadata accessor.
   *
   * Inspection answers what the input is. It does not claim that any decoder
   * output works in the current environment.
   */
  static inspect(_input, _options = null)
  {
    const error = new Error(`${this.name}.inspect is not implemented.`);
    error.code = "CJS_FORMAT_INSPECT_NOT_IMPLEMENTED";
    throw error;
  }

  /** Cheap synchronous identification used only for route selection. */
  static is(input, options = null)
  {
    try
    {
      if (Object.hasOwn(this, "probeSupport"))
      {
        return recognizesProbe(this.probeSupport(input, options || {}));
      }
      this.inspect(input, options || {});
      return true;
    }
    catch
    {
      return false;
    }
  }

  /**
   * Format-specific cheap support probe hook.
   *
   * Concrete formats may override this with header/environment reasoning. The
   * public getSupport() method normalizes its result into the uniform contract.
   */
  static probeSupport(input, options = null)
  {
    try
    {
      return {
        format: this.id,
        source: typeof input === "string" ? "path" : "buffer",
        recognized: true,
        metadata: this.inspect(input, options || {}),
        reason: "Container structure recognized."
      };
    }
    catch (error)
    {
      return {
        format: this.id,
        source: typeof input === "string" ? "path" : "buffer",
        recognized: false,
        metadata: null,
        reason: error?.message || "Input was not recognized.",
        errors: [ error?.message || "Input was not recognized." ]
      };
    }
  }

  /**
   * Cheap synchronous output support report.
   *
   * This is advisory: it may use headers, structure, and current environment
   * features, but never claims that the decoder ran. Every output entry is
   * therefore returned with verified:false.
   */
  static getSupport(input, options = null)
  {
    const values = options && typeof options === "object" ? options : {};
    let report;
    try
    {
      report = this.probeSupport(input, values);
    }
    catch (error)
    {
      report = {
        format: this.id,
        source: typeof input === "string" ? "path" : "buffer",
        recognized: false,
        reason: error?.message || "Support probe failed.",
        errors: [ error?.message || "Support probe failed." ]
      };
    }
    return normalizeSupportReport(this, report, values);
  }

  /**
   * Prove one exact output by exercising the real asynchronous reader.
   *
   * This is an explicit diagnostic/capability operation. Normal resource
   * loading calls readAsync() once and treats its successful result as proof;
   * it must not verify and then decode the same payload a second time.
   */
  static async verifySupport(input, options = null)
  {
    const values = options && typeof options === "object" ? options : {};
    const report = this.getSupport(input, values);
    const capability = this.getOutputCapability(report.output);

    if (!capability)
    {
      const message = report.output
        ? `${this.name} declares no output ${JSON.stringify(report.output)}.`
        : `${this.name} declares no verifiable default output.`;
      return Object.freeze({
        ...report,
        supported: false,
        verified: true,
        reason: message,
        error: Object.freeze({
          name: "Error",
          code: "CJS_FORMAT_OUTPUT_UNDECLARED",
          message
        })
      });
    }

    try
    {
      await this.readAsync(input, { ...values, emit: capability.output });
      return freezeVerification(report, capability, true, null);
    }
    catch (error)
    {
      return freezeVerification(report, capability, false, error);
    }
  }

  /** Return the canonical declaration for one output selector. */
  static getOutputCapability(output = null)
  {
    if (!output)
    {
      return Object.values(this.outputs).find(entry => entry.default) || null;
    }
    const normalized = String(output).toLowerCase();
    return Object.values(this.outputs).find(entry =>
      entry.output.toLowerCase() === normalized) || null;
  }

  /** Freeze and validate one format's authoritative output map. */
  static defineOutputs(definitions = {})
  {
    if (!definitions || typeof definitions !== "object" || Array.isArray(definitions))
    {
      throw new TypeError("CjsFormat.defineOutputs requires an object map.");
    }

    const outputs = {};
    let defaults = 0;
    for (const [ output, definition ] of Object.entries(definitions))
    {
      if (!output || !definition || typeof definition !== "object" || Array.isArray(definition))
      {
        throw new TypeError("Each format output requires a non-empty name and descriptor.");
      }
      const role = definition.role || OUTPUT_ROLE_RUNTIME;
      const readMode = definition.readMode || READ_MODE_SYNC;
      if (![ OUTPUT_ROLE_RUNTIME, OUTPUT_ROLE_DEBUG ].includes(role))
      {
        throw new TypeError(`Format output ${output} has invalid role ${JSON.stringify(role)}.`);
      }
      if (![ READ_MODE_SYNC, READ_MODE_ASYNC ].includes(readMode))
      {
        throw new TypeError(`Format output ${output} has invalid readMode ${JSON.stringify(readMode)}.`);
      }
      if (definition.default === true) defaults++;
      const probes = definition.probes ?? definition.probe ?? output;
      outputs[output] = Object.freeze({
        output,
        payloadType: definition.payloadType || output,
        role,
        readMode,
        decoded: definition.decoded === true,
        passthrough: definition.passthrough === true,
        default: definition.default === true,
        probes: Object.freeze((Array.isArray(probes) ? probes : [ probes ]).map(String)),
        requires: Object.freeze([ ...(definition.requires || []) ])
      });
    }
    if (defaults > 1) throw new TypeError("A format may declare only one default output.");
    if (Object.keys(outputs).length > 0 && defaults !== 1)
    {
      throw new TypeError("A format with outputs must declare exactly one default output.");
    }
    return Object.freeze(outputs);
  }

  /** Assert the canonical format surface without requiring optional outputs. */
  static validateContract(Constructor)
  {
    if (typeof Constructor !== "function" || !(Constructor.prototype instanceof CjsFormat))
    {
      throw new TypeError("CjsFormat.validateContract requires a CjsFormat subclass.");
    }
    if (typeof Constructor.id !== "string" || !Constructor.id)
    {
      throw new TypeError(`${Constructor.name} must declare a non-empty id.`);
    }
    if (!Array.isArray(Constructor.mediaTypes) || Constructor.mediaTypes.length === 0
      || !Object.isFrozen(Constructor.mediaTypes))
    {
      throw new TypeError(`${Constructor.name} must declare frozen non-empty mediaTypes.`);
    }
    for (const mediaType of Constructor.mediaTypes)
    {
      if (!Object.values(MediaType).includes(mediaType))
      {
        throw new TypeError(`${Constructor.name} media type ${JSON.stringify(mediaType)} is not canonical.`);
      }
    }
    if (!Array.isArray(Constructor.extensions) || !Object.isFrozen(Constructor.extensions))
    {
      throw new TypeError(`${Constructor.name} must declare frozen extensions.`);
    }
    if (!Constructor.outputs || typeof Constructor.outputs !== "object"
      || Array.isArray(Constructor.outputs) || !Object.isFrozen(Constructor.outputs))
    {
      throw new TypeError(`${Constructor.name} must declare frozen outputs.`);
    }
    if (typeof Constructor.requestResponseType !== "string" || !Constructor.requestResponseType)
    {
      throw new TypeError(`${Constructor.name} must declare a requestResponseType.`);
    }
    if (Constructor.worker !== null)
    {
      if (!Constructor.worker || typeof Constructor.worker !== "object" || !Object.isFrozen(Constructor.worker))
      {
        throw new TypeError(`${Constructor.name}.worker must be null or a frozen descriptor.`);
      }
      if (typeof Constructor.worker.module !== "string" || !Constructor.worker.module
        || typeof Constructor.worker.exportName !== "string" || !Constructor.worker.exportName
        || !Array.isArray(Constructor.worker.outputTypes) || !Object.isFrozen(Constructor.worker.outputTypes))
      {
        throw new TypeError(`${Constructor.name}.worker has an invalid execution descriptor.`);
      }
      for (const output of Constructor.worker.outputTypes)
      {
        if (!Constructor.getOutputCapability(output))
        {
          throw new TypeError(`${Constructor.name}.worker names undeclared output ${JSON.stringify(output)}.`);
        }
      }
      if (Constructor.worker.defaultOutput && !Constructor.getOutputCapability(Constructor.worker.defaultOutput))
      {
        throw new TypeError(`${Constructor.name}.worker names an undeclared default output.`);
      }
    }
    for (const retired of [ "type", "inputTypes", "outputTypes", "debugOutputTypes", "implementationStatus" ])
    {
      if (Object.hasOwn(Constructor, retired))
      {
        throw new TypeError(`${Constructor.name} must not declare retired static ${retired}.`);
      }
    }
    let defaults = 0;
    for (const [ output, capability ] of Object.entries(Constructor.outputs))
    {
      if (!Object.isFrozen(capability))
      {
        throw new TypeError(`${Constructor.name} output capabilities must be frozen.`);
      }
      if (capability.output !== output)
      {
        throw new TypeError(`${Constructor.name} output ${output} has a mismatched descriptor.`);
      }
      if (capability.default) defaults++;
    }
    if (Object.keys(Constructor.outputs).length > 0 && defaults !== 1)
    {
      throw new TypeError(`${Constructor.name} must declare exactly one default output.`);
    }
  }

  static Type = MediaType;
  static MediaType = MediaType;
  static OutputType = Object.freeze({
    AUDIO: PayloadType.AUDIO,
    CMF: "cmf",
    DOCUMENT: "document",
    GR2: "gr2",
    IMAGE: PayloadType.IMAGE,
    JSON: "json",
    MEDIA: "media",
    METADATA: "metadata",
    OGG: "ogg",
    PAYLOAD: "payload",
    PCM: "pcm",
    RAW: PayloadType.RAW,
    RGBA: "rgba",
    RUNTIME: "runtime",
    SCHEMA: PayloadType.SCHEMA,
    SHADER: PayloadType.SHADER,
    SHARED: "shared",
    TEXTURE: PayloadType.TEXTURE,
    VIDEO: PayloadType.VIDEO
  });

  static id = "";
  static mediaTypes = Object.freeze([]);
  static extensions = Object.freeze([]);
  static outputs = Object.freeze({});
  static requestResponseType = "arraybuffer";
  static worker = null;
}

function normalizeSupportReport(Format, rawReport, options)
{
  const raw = typeof rawReport === "boolean"
    ? { recognized: rawReport, supported: rawReport }
    : rawReport && typeof rawReport === "object" ? rawReport : {};
  const requested = options.emit ?? null;
  const capability = Format.getOutputCapability(requested);
  const legacyVariants = Array.isArray(raw.variants) ? raw.variants : [];
  const rawPositive = raw.supported === true
    || raw.supported === "full"
    || raw.supported === "partial";
  const recognized = raw.recognized === true
    || (raw.recognized !== false && (raw.metadata != null || rawPositive));

  const outputs = Object.values(Format.outputs).map(entry =>
  {
    const variant = findLegacyVariant(entry, legacyVariants);
    const supported = variant
      ? variant.supported === true
      : recognized && (legacyVariants.length === 0 ? raw.supported !== false && raw.supported !== "none" : false);
    return Object.freeze({
      ...entry,
      supported,
      verified: false,
      codec: variant?.codec || "",
      reason: variant?.reason
        || raw.reason
        || (supported ? "Output appears usable from structural evidence." : "Output was not supported by the structural probe."),
      requires: Object.freeze([ ...(variant?.requires || entry.requires) ])
    });
  });

  const selected = capability
    ? outputs.find(entry => entry.output === capability.output) || null
    : null;
  const preferredOutput = resolvePreferredOutput(raw.preferredOutput, outputs)
    || outputs.find(entry => entry.supported && entry.role === OUTPUT_ROLE_RUNTIME)?.output
    || outputs.find(entry => entry.supported)?.output
    || "";

  return Object.freeze({
    format: Format.id || raw.format || Format.name,
    source: raw.source || options.source || "buffer",
    recognized,
    output: capability?.output || (requested == null ? "" : String(requested)),
    supported: selected?.supported === true,
    verified: false,
    preferredOutput,
    reason: selected?.reason || raw.reason || (recognized ? "Input recognized." : "Input not recognized."),
    metadata: raw.metadata ?? null,
    capability: selected,
    outputs: Object.freeze(outputs),
    warnings: Object.freeze([ ...(raw.warnings || []) ]),
    errors: Object.freeze([ ...(raw.errors || []) ]),
    error: null
  });
}

function recognizesProbe(report)
{
  if (report === true) return true;
  if (!report || typeof report !== "object" || report.recognized === false) return false;
  return report.recognized === true
    || report.supported === true
    || report.supported === "full"
    || report.supported === "partial"
    || report.metadata != null;
}

function findLegacyVariant(capability, variants)
{
  const probes = new Set(capability.probes.map(value => value.toLowerCase()));
  const matches = variants.filter(variant =>
  {
    for (const value of [ variant?.output, variant?.kind, variant?.payloadType ])
    {
      if (value != null && probes.has(String(value).toLowerCase())) return true;
    }
    return false;
  });
  const output = capability.output.toLowerCase();
  return matches.find(variant => String(variant?.output || "").toLowerCase() === output)
    || matches.find(variant => String(variant?.kind || "").toLowerCase() === output)
    || matches.find(variant => String(variant?.payloadType || "").toLowerCase() === output)
    || matches.find(variant => variant.supported === true)
    || matches[0]
    || null;
}

function resolvePreferredOutput(preferredOutput, outputs)
{
  if (!preferredOutput) return "";
  const normalized = String(preferredOutput).toLowerCase();
  const direct = outputs.find(entry => entry.output.toLowerCase() === normalized);
  return direct?.output || "";
}

function freezeVerification(report, capability, supported, error)
{
  const errorReport = error ? serializeError(error) : null;
  const outputs = report.outputs.map(entry => entry.output === capability.output
    ? Object.freeze({
      ...entry,
      supported,
      verified: true,
      reason: supported ? "The real asynchronous read path completed successfully." : errorReport.message
    })
    : entry);
  return Object.freeze({
    ...report,
    recognized: supported ? true : report.recognized,
    supported,
    verified: true,
    reason: supported ? "The real asynchronous read path completed successfully." : errorReport.message,
    capability: outputs.find(entry => entry.output === capability.output) || null,
    outputs: Object.freeze(outputs),
    errors: errorReport ? Object.freeze([ ...report.errors, errorReport.message ]) : report.errors,
    error: errorReport
  });
}

function serializeError(error)
{
  const details = {};
  for (const [ key, value ] of Object.entries(error || {}))
  {
    if ([ "name", "code", "message", "cause" ].includes(key)) continue;
    details[key] = value;
  }
  return Object.freeze({
    name: error?.name || "Error",
    code: error?.code || "CJS_FORMAT_VERIFY_FAILED",
    message: error?.message || String(error),
    details: Object.freeze(details),
    cause: error?.cause
      ? Object.freeze({
        name: error.cause.name || "Error",
        code: error.cause.code || "",
        message: error.cause.message || String(error.cause)
      })
      : null
  });
}

export const CjsFormatOutputRole = Object.freeze({
  RUNTIME: OUTPUT_ROLE_RUNTIME,
  DEBUG: OUTPUT_ROLE_DEBUG
});

export const CjsFormatReadMode = Object.freeze({
  SYNC: READ_MODE_SYNC,
  ASYNC: READ_MODE_ASYNC
});

export default CjsFormat;
