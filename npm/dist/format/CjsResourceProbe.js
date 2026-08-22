import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type } from '@carbonenginejs/runtime-utils/schema';

let _initClass, _init_format, _init_extra_format, _init_source, _init_extra_source, _init_recognized, _init_extra_recognized, _init_output, _init_extra_output, _init_supported, _init_extra_supported, _init_verified, _init_extra_verified, _init_preferredOutput, _init_extra_preferredOutput, _init_reason, _init_extra_reason, _init_metadata, _init_extra_metadata, _init_capability, _init_extra_capability, _init_outputs, _init_extra_outputs, _init_warnings, _init_extra_warnings, _init_errors, _init_extra_errors, _init_error, _init_extra_error;

/**
 * Persistable resource-layer view of a format support report.
 *
 * Concrete formats return decorator-free plain objects so their direct
 * subpaths stay importable without a build transform. Consumers that need a
 * model normalize those reports here with {@link CjsResourceProbe.from}.
 */
let _CjsResourceProbe;
class CjsResourceProbe extends CjsModel {
  static {
    ({
      e: [_init_format, _init_extra_format, _init_source, _init_extra_source, _init_recognized, _init_extra_recognized, _init_output, _init_extra_output, _init_supported, _init_extra_supported, _init_verified, _init_extra_verified, _init_preferredOutput, _init_extra_preferredOutput, _init_reason, _init_extra_reason, _init_metadata, _init_extra_metadata, _init_capability, _init_extra_capability, _init_outputs, _init_extra_outputs, _init_warnings, _init_extra_warnings, _init_errors, _init_extra_errors, _init_error, _init_extra_error],
      c: [_CjsResourceProbe, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsResourceProbe",
      family: "resource"
    })], [[[io, io.persist, type, type.string], 16, "format"], [[io, io.persist, type, type.string], 16, "source"], [[io, io.persist, type, type.boolean], 16, "recognized"], [[io, io.persist, type, type.string], 16, "output"], [[io, io.persist, type, type.boolean], 16, "supported"], [[io, io.persist, type, type.boolean], 16, "verified"], [[io, io.persist, type, type.string], 16, "preferredOutput"], [[io, io.persist, type, type.string], 16, "reason"], [[io, io.persist, type, type.unknown], 16, "metadata"], [[io, io.persist, type, type.unknown], 16, "capability"], [[io, io.persist, void 0, type.list("unknown")], 16, "outputs"], [[io, io.persist, void 0, type.list("string")], 16, "warnings"], [[io, io.persist, void 0, type.list("string")], 16, "errors"], [[io, io.persist, type, type.unknown], 16, "error"]], 0, void 0, CjsModel));
  }
  format = _init_format(this, "");
  source = (_init_extra_format(this), _init_source(this, ""));
  recognized = (_init_extra_source(this), _init_recognized(this, false));
  output = (_init_extra_recognized(this), _init_output(this, ""));
  supported = (_init_extra_output(this), _init_supported(this, false));
  verified = (_init_extra_supported(this), _init_verified(this, false));
  preferredOutput = (_init_extra_verified(this), _init_preferredOutput(this, ""));
  reason = (_init_extra_preferredOutput(this), _init_reason(this, ""));
  metadata = (_init_extra_reason(this), _init_metadata(this, null));
  capability = (_init_extra_metadata(this), _init_capability(this, null));
  outputs = (_init_extra_capability(this), _init_outputs(this, []));
  warnings = (_init_extra_outputs(this), _init_warnings(this, []));
  errors = (_init_extra_warnings(this), _init_errors(this, []));
  error = (_init_extra_errors(this), _init_error(this, null));
  constructor(values = null) {
    super(), _init_extra_error(this);
    this.SetValues(normalizeReport(values), {
      markDirty: false,
      skipUpdate: true,
      skipEvents: true
    });
  }

  /** Replace this report from a plain format result. */
  Initialize(values = null) {
    this.SetValues(normalizeReport(values), {
      skipEvents: true
    });
    return this;
  }

  /** Normalize a plain format report at the decorated resource boundary. */
  static from(input) {
    if (input instanceof _CjsResourceProbe) return input;
    if (input && typeof input.toJSON === "function") return new this(input.toJSON());
    return new this(input);
  }

  /** Whether the selected output is usable, optionally requiring real proof. */
  canUseSelected(options = null) {
    return this.supported === true && (!options?.verified || this.verified === true);
  }

  /** Whether one declared output is usable, optionally requiring real proof. */
  canUse(output, options = null) {
    const normalized = String(output || "").toLowerCase();
    const capability = this.outputs.find(entry => String(entry?.output || "").toLowerCase() === normalized);
    return capability?.supported === true && (!options?.verified || capability.verified === true);
  }
  static {
    _initClass();
  }
}
function normalizeReport(input) {
  const report = input && typeof input === "object" ? input : {};
  const outputs = Array.isArray(report.outputs) ? report.outputs.map(normalizeCapability) : [];
  const selected = report.capability && typeof report.capability === "object" ? normalizeCapability(report.capability) : outputs.find(entry => entry.output === report.output) || null;
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
function normalizeCapability(input) {
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

export { _CjsResourceProbe as CjsResourceProbe };
//# sourceMappingURL=CjsResourceProbe.js.map
