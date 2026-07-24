import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { type, io } from '@carbonenginejs/runtime-utils/schema';
import { CjsCharacterCapabilityRequirement as _CjsCharacterCapabili$1 } from './CjsCharacterCapabilityRequirement.js';
import { CjsCharacterNode as _CjsCharacterNode } from '../CjsCharacterNode.js';

let _initClass, _init_status, _init_extra_status, _init_sourceComplete, _init_extra_sourceComplete, _init_requiredNames, _init_extra_requiredNames, _init_availableNames, _init_extra_availableNames, _init_matchedNames, _init_extra_matchedNames, _init_missingNames, _init_extra_missingNames, _init_unresolvedNames, _init_extra_unresolvedNames;
let _CjsCharacterCapabili;
class CjsCharacterCapabilityCoverage extends _CjsCharacterNode {
  static {
    ({
      e: [_init_status, _init_extra_status, _init_sourceComplete, _init_extra_sourceComplete, _init_requiredNames, _init_extra_requiredNames, _init_availableNames, _init_extra_availableNames, _init_matchedNames, _init_extra_matchedNames, _init_missingNames, _init_extra_missingNames, _init_unresolvedNames, _init_extra_unresolvedNames],
      c: [_CjsCharacterCapabili, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterCapabilityCoverage",
      family: "character"
    })], [[[type, type.string, io, io.persist], 16, "status"], [[type, type.boolean, io, io.persist], 16, "sourceComplete"], [[void 0, type.list("string"), io, io.persist], 16, "requiredNames"], [[void 0, type.list("string"), io, io.persist], 16, "availableNames"], [[void 0, type.list("string"), io, io.persist], 16, "matchedNames"], [[void 0, type.list("string"), io, io.persist], 16, "missingNames"], [[void 0, type.list("string"), io, io.persist], 16, "unresolvedNames"]], 0, void 0, _CjsCharacterNode));
  }
  constructor(...args) {
    super(...args);
    _init_extra_unresolvedNames(this);
  }
  status = _init_status(this, "unknown");
  sourceComplete = (_init_extra_status(this), _init_sourceComplete(this, false));
  requiredNames = (_init_extra_sourceComplete(this), _init_requiredNames(this, []));
  availableNames = (_init_extra_requiredNames(this), _init_availableNames(this, []));
  matchedNames = (_init_extra_availableNames(this), _init_matchedNames(this, []));
  missingNames = (_init_extra_matchedNames(this), _init_missingNames(this, []));
  unresolvedNames = (_init_extra_missingNames(this), _init_unresolvedNames(this, []));

  /** Compares exact names while retaining whether the supplied evidence was complete. */
  static inspect(requiredNames, availableNames, {
    sourceComplete = availableNames !== null
  } = {}) {
    const required = _CjsCharacterCapabili$1.normalizeNames(requiredNames || [], "required capability");
    const available = availableNames === null || availableNames === undefined ? [] : _CjsCharacterCapabili$1.normalizeNames(availableNames, "available capability");
    const availableSet = new Set(available);
    const matched = required.filter(name => availableSet.has(name));
    const unobserved = required.filter(name => !availableSet.has(name));
    const complete = Boolean(sourceComplete);
    const missing = complete ? unobserved : [];
    const unresolved = complete ? [] : unobserved;
    let status;
    if (unobserved.length === 0) {
      status = "complete";
    } else if (!complete) {
      status = "unknown";
    } else if (matched.length === 0) {
      status = "none";
    } else {
      status = "partial";
    }
    return _CjsCharacterCapabili.from({
      status,
      sourceComplete: complete,
      requiredNames: required,
      availableNames: available,
      matchedNames: matched,
      missingNames: missing,
      unresolvedNames: unresolved
    });
  }
  static {
    _initClass();
  }
}

export { _CjsCharacterCapabili as CjsCharacterCapabilityCoverage };
//# sourceMappingURL=CjsCharacterCapabilityCoverage.js.map
