import { CjsModel } from "#model";
import { CjsSchema, edit, type } from "#schema";

/**
 * Persistable resource-layer view of a format support report.
 *
 * Concrete formats return decorator-free plain objects so their direct
 * subpaths stay importable without a build transform. Consumers that need a
 * model normalize those reports here with {@link CjsResourceProbe.from}.
 */
export class CjsResourceProbe extends CjsModel
{
  format = "";

  source = "";

  recognized = false;

  output = "";

  supported = false;

  verified = false;

  preferredOutput = "";

  reason = "";

  metadata = null;

  capability = null;

  outputs = [];

  warnings = [];

  errors = [];

  error = null;

  /**
   * Create a normalized resource-layer support report.
   * @param {object|null} [values] Plain format support report.
   */
  constructor(values = null)
  {
    super();
    this.SetValues(normalizeReport(values), {
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

CjsSchema.define(CjsResourceProbe, {
  className: "CjsResourceProbe", family: "resource",
  fields: {
    format: [ edit.persist, type.string ],
    source: [ edit.persist, type.string ],
    recognized: [ edit.persist, type.boolean ],
    output: [ edit.persist, type.string ],
    supported: [ edit.persist, type.boolean ],
    verified: [ edit.persist, type.boolean ],
    preferredOutput: [ edit.persist, type.string ],
    reason: [ edit.persist, type.string ],
    metadata: [ edit.persist, type.unknown ],
    capability: [ edit.persist, type.unknown ],
    outputs: [ edit.persist, type.list("unknown") ],
    warnings: [ edit.persist, type.list("string") ],
    errors: [ edit.persist, type.list("string") ],
    error: [ edit.persist, type.unknown ]
  }
});
