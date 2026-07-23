import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { type, io } from '@carbonenginejs/core-types/schema';
import { CjsCharacterCapabilityCoverage as _CjsCharacterCapabili$1 } from './CjsCharacterCapabilityCoverage.js';
import { CjsCharacterCapabilityRequirement as _CjsCharacterCapabili } from './CjsCharacterCapabilityRequirement.js';
import { CjsCharacterNode as _CjsCharacterNode } from '../CjsCharacterNode.js';

let _initClass, _init_id, _init_extra_id, _init_declaredPaletteCoverage, _init_extra_declaredPaletteCoverage, _init_activePaletteCoverage, _init_extra_activePaletteCoverage, _init_morphCoverage, _init_extra_morphCoverage;
let _CjsCharacterMeshCapa;
class CjsCharacterMeshCapability extends _CjsCharacterNode {
  static {
    ({
      e: [_init_id, _init_extra_id, _init_declaredPaletteCoverage, _init_extra_declaredPaletteCoverage, _init_activePaletteCoverage, _init_extra_activePaletteCoverage, _init_morphCoverage, _init_extra_morphCoverage],
      c: [_CjsCharacterMeshCapa, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterMeshCapability",
      family: "character"
    })], [[[type, type.string, io, io.persist], 16, "id"], [[void 0, type.objectRef("CjsCharacterCapabilityCoverage"), io, io.persist], 16, "declaredPaletteCoverage"], [[void 0, type.objectRef("CjsCharacterCapabilityCoverage"), io, io.persist], 16, "activePaletteCoverage"], [[void 0, type.objectRef("CjsCharacterCapabilityCoverage"), io, io.persist], 16, "morphCoverage"]], 0, void 0, _CjsCharacterNode));
  }
  constructor(...args) {
    super(...args);
    _init_extra_morphCoverage(this);
  }
  id = _init_id(this, "");
  declaredPaletteCoverage = (_init_extra_id(this), _init_declaredPaletteCoverage(this, null));
  activePaletteCoverage = (_init_extra_declaredPaletteCoverage(this), _init_activePaletteCoverage(this, null));
  morphCoverage = (_init_extra_activePaletteCoverage(this), _init_morphCoverage(this, null));

  /**
   * Builds independent exact-name coverage from one normalized mesh descriptor.
   * activeBoneNames must contain only bindings referenced by non-zero vertex
   * influence weights; blend indices in zero-weight lanes are not active.
   */
  static inspect(value, requirement) {
    const source = value || {};
    const required = _CjsCharacterCapabili.prepare(requirement);
    const id = _CjsCharacterCapabili.normalizeName(source.id, "mesh id");
    const declaredPaletteCoverage = _CjsCharacterCapabili$1.inspect(required.boneNames, source.declaredBoneNames ?? null, {
      sourceComplete: source.declaredBoneNames !== null && source.declaredBoneNames !== undefined
    });
    const activePaletteCoverage = _CjsCharacterCapabili$1.inspect(required.boneNames, source.activeBoneNames ?? null, {
      sourceComplete: source.activeBoneNames !== null && source.activeBoneNames !== undefined
    });
    _CjsCharacterMeshCapa.validatePaletteRelationship(id, declaredPaletteCoverage, activePaletteCoverage);
    return _CjsCharacterMeshCapa.from({
      id,
      declaredPaletteCoverage: declaredPaletteCoverage.GetValues(),
      activePaletteCoverage: activePaletteCoverage.GetValues(),
      morphCoverage: _CjsCharacterCapabili$1.inspect(required.morphNames, source.morphTargetNames ?? null, {
        sourceComplete: source.morphTargetNames !== null && source.morphTargetNames !== undefined
      }).GetValues()
    });
  }

  /** Requires proven active bindings to be a subset of a complete declared palette. */
  static validatePaletteRelationship(meshID, declaredCoverage, activeCoverage) {
    if (!declaredCoverage?.sourceComplete || !activeCoverage?.sourceComplete) {
      return true;
    }
    const declared = new Set(declaredCoverage.availableNames);
    const invalid = activeCoverage.availableNames.filter(name => !declared.has(name));
    if (invalid.length) {
      throw new Error(`Character mesh "${meshID}" active palette contains undeclared bone "${invalid[0]}"`);
    }
    return true;
  }
  static {
    _initClass();
  }
}

export { _CjsCharacterMeshCapa as CjsCharacterMeshCapability };
//# sourceMappingURL=CjsCharacterMeshCapability.js.map
