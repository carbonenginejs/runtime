import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_type, _init_extra_type, _init_name, _init_extra_name;

/** Tr2ParticleElementDeclarationName (particle) - generated from schema shapeHash 115c80e5.... */
let _Tr2ParticleElementDe;
new class extends _identity {
  static [class Tr2ParticleElementDeclarationName extends CjsModel {
    static {
      ({
        e: [_init_type, _init_extra_type, _init_name, _init_extra_name],
        c: [_Tr2ParticleElementDe, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2ParticleElementDeclarationName",
        family: "particle"
      })], [[[type, type.int32, void 0, type.enum("Type")], 16, "type"], [[type, type.string], 16, "name"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_name(this);
    }
    /** m_type (Type - enum Type) */
    type = _init_type(this, 0);

    /** m_name (std::string) */
    name = (_init_extra_type(this), _init_name(this, ""));

    /** Carbon operator== - CUSTOM elements also compare their names. */
    Equals(other) {
      if (this.type !== other?.type) {
        return false;
      }
      return this.type !== _Tr2ParticleElementDe.Type.CUSTOM || this.name === other.name;
    }

    /** Carbon operator< - map-key ordering (type, then name for CUSTOM pairs). */
    Compare(other) {
      if (this.type < other.type) {
        return true;
      }
      return this.type === _Tr2ParticleElementDe.Type.CUSTOM && other.type === _Tr2ParticleElementDe.Type.CUSTOM && this.name < other.name;
    }

    /** Carbon GetName - human-readable name; CUSTOM returns the custom name. */
    GetName() {
      if (this.type >= _Tr2ParticleElementDe.Type.CUSTOM) {
        return this.name;
      }
      return _Tr2ParticleElementDe.#typeNames[this.type];
    }

    /**
     * Carbon GetD3DUsage - vertex usage code for this particle element
     * (LIFETIME->TANGENT, POSITION->POSITION, VELOCITY->NORMAL,
     * MASS->BITANGENT, CUSTOM->TEXCOORD).
     */
    GetD3DUsage() {
      return _Tr2ParticleElementDe.#usageCodes[this.type];
    }

    /** Tr2VertexDefinition::UsageCode values (shared with Tr2RuntimeInstanceData.UsageCode). */
  }];
  #typeNames = Object.freeze(["LIFETIME", "POSITION", "VELOCITY", "MASS"]);
  #usageCodes = Object.freeze([3, 0, 2, 4, 5]);
  Type = Object.freeze({
    LIFETIME: 0,
    POSITION: 1,
    VELOCITY: 2,
    MASS: 3,
    CUSTOM: 4
  });
  constructor() {
    super(_Tr2ParticleElementDe), _initClass();
  }
}();

export { _Tr2ParticleElementDe as Tr2ParticleElementDeclarationName };
//# sourceMappingURL=Tr2ParticleElementDeclarationName.js.map
