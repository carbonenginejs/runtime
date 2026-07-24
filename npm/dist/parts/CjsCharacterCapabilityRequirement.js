import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { type, io } from '@carbonenginejs/runtime-utils/schema';
import { CjsCharacterNode as _CjsCharacterNode } from '../CjsCharacterNode.js';

let _initClass, _init_id, _init_extra_id, _init_boneNames, _init_extra_boneNames, _init_morphNames, _init_extra_morphNames;
let _CjsCharacterCapabili;
class CjsCharacterCapabilityRequirement extends _CjsCharacterNode {
  static {
    ({
      e: [_init_id, _init_extra_id, _init_boneNames, _init_extra_boneNames, _init_morphNames, _init_extra_morphNames],
      c: [_CjsCharacterCapabili, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterCapabilityRequirement",
      family: "character"
    })], [[[type, type.string, io, io.persist], 16, "id"], [[void 0, type.list("string"), io, io.persist], 16, "boneNames"], [[void 0, type.list("string"), io, io.persist], 16, "morphNames"]], 0, void 0, _CjsCharacterNode));
  }
  constructor(...args) {
    super(...args);
    _init_extra_morphNames(this);
  }
  id = _init_id(this, "");
  boneNames = (_init_extra_id(this), _init_boneNames(this, []));
  morphNames = (_init_extra_boneNames(this), _init_morphNames(this, []));

  /** Validates and returns a detached requirement with stable exact names. */
  static prepare(value) {
    const result = _CjsCharacterCapabili.from(value instanceof _CjsCharacterCapabili ? value.GetValues() : value || {});
    result.id = _CjsCharacterCapabili.normalizeName(result.id, "requirement id");
    result.boneNames = _CjsCharacterCapabili.normalizeNames(result.boneNames, "required bone");
    result.morphNames = _CjsCharacterCapabili.normalizeNames(result.morphNames, "required morph");
    return result;
  }

  /** Validates one exact name without case folding. */
  static normalizeName(value, label = "capability") {
    if (typeof value !== "string" || !value.trim()) {
      throw new TypeError(`Character ${label} must be a non-empty string`);
    }
    return value.trim();
  }

  /** Validates a unique exact-name list while preserving caller order. */
  static normalizeNames(values, label = "capability") {
    if (!Array.isArray(values)) {
      throw new TypeError(`Character ${label} names must be an array`);
    }
    const names = new Set();
    return values.map(value => {
      const name = _CjsCharacterCapabili.normalizeName(value, label);
      if (names.has(name)) {
        throw new Error(`Character ${label} names contain duplicate "${name}"`);
      }
      names.add(name);
      return name;
    });
  }
  static {
    _initClass();
  }
}

export { _CjsCharacterCapabili as CjsCharacterCapabilityRequirement };
//# sourceMappingURL=CjsCharacterCapabilityRequirement.js.map
