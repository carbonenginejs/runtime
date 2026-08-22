import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { io, type } from "@carbonenginejs/runtime-utils/schema";

/**
 * Persistable resource-layer view of a format support report.
 *
 * Concrete formats return decorator-free plain objects so their direct
 * subpaths stay importable without a build transform. Consumers that need a
 * model normalize those reports here with {@link CjsResourceProbe.from}.
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
  @type.boolean
  recognized = false;

  @io.persist
  @type.string
  output = "";

  @io.persist
  @type.boolean
  supported = false;

  @io.persist
  @type.boolean
  verified = false;

  @io.persist
  @type.string
  preferredOutput = "";

  @io.persist
  @type.string
  reason = "";

  @io.persist
  @type.unknown
  metadata = null;

  @io.persist
  @type.unknown
  capability = null;

  @io.persist
  @type.list("unknown")
  outputs = [];

  @io.persist
  @type.list("string")
  warnings = [];

  @io.persist
  @type.list("string")
  errors = [];

  @io.persist
  @type.unknown
  error = null;

  constructor(values = null)
  {
    super();
    this.SetValues(normalizeReport(values), {
      markDirty: false,
      skipUpdate: true,
      skipEvents: true
    });
  }

  /** Replace this report from a plain format result. */
  Initialize(values = null)
  {
    this.SetValues(normalizeReport(values), { skipEvents: true });
    return this;
  }

  /** Normalize a plain format report at the decorated resource boundary. */
  static from(input)
  {
    if (input instanceof CjsResourceProbe) return input;
    if (input && typeof input.toJSON === "function") return new this(input.toJSON());
    return new this(input);
  }

  /** Whether the selected output is usable, optionally requiring real proof. */
  canUseSelected(options = null)
  {
    return this.supported === true && (!options?.verified || this.verified === true);
  }

  /** Whether one declared output is usable, optionally requiring real proof. */
  canUse(output, options = null)
  {
    const normalized = String(output || "").toLowerCase();
    const capability = this.outputs.find(entry =>
      String(entry?.output || "").toLowerCase() === normalized);
    return capability?.supported === true
      && (!options?.verified || capability.verified === true);
  }
}

function normalizeReport(input)
{
  const report = input && typeof input === "object" ? input : {};
  const outputs = Array.isArray(report.outputs)
    ? report.outputs.map(normalizeCapability)
    : [];
  const selected = report.capability && typeof report.capability === "object"
    ? normalizeCapability(report.capability)
    : outputs.find(entry => entry.output === report.output) || null;
  return {
    format: String(report.format || ""),
    source: String(report.source || ""),
    recognized: report.recognized === true,
    output: String(report.output || ""),
    supported: report.supported === true,
    verified: report.verified === true,
    preferredOutput: String(report.preferredOutput || ""),
    reason: String(report.reason || ""),
    metadata: report.metadata ?? null,
    capability: selected,
    outputs,
    warnings: Array.isArray(report.warnings) ? report.warnings.map(String) : [],
    errors: Array.isArray(report.errors) ? report.errors.map(String) : [],
    error: report.error ?? null
  };
}

function normalizeCapability(input)
{
  const capability = input && typeof input === "object" ? input : {};
  return {
    ...capability,
    output: String(capability.output || ""),
    payloadType: String(capability.payloadType || capability.output || ""),
    supported: capability.supported === true,
    verified: capability.verified === true,
    requires: Array.isArray(capability.requires) ? capability.requires.map(String) : []
  };
}

export default CjsResourceProbe;
