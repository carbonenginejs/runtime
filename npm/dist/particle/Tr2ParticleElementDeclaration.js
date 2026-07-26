import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, schema } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_elementType, _init_extra_elementType, _init_customName, _init_extra_customName, _init_dimension, _init_extra_dimension, _init_usedByGPU, _init_extra_usedByGPU, _init_usageIndex, _init_extra_usageIndex;

/** Tr2ParticleElementDeclaration (particle) - generated from schema shapeHash 272e6639.... */
let _Tr2ParticleElementDe;
new class extends _identity {
  static [class Tr2ParticleElementDeclaration extends CjsModel {
    static {
      ({
        e: [_init_elementType, _init_extra_elementType, _init_customName, _init_extra_customName, _init_dimension, _init_extra_dimension, _init_usedByGPU, _init_extra_usedByGPU, _init_usageIndex, _init_extra_usageIndex],
        c: [_Tr2ParticleElementDe, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2ParticleElementDeclaration",
        family: "particle"
      })], [[[io, io.persist, type, type.int32, void 0, schema.enum("Type")], 16, "elementType"], [[io, io.persist, type, type.string], 16, "customName"], [[io, io.persist, type, type.uint32], 16, "dimension"], [[io, io.persist, type, type.boolean], 16, "usedByGPU"], [[io, io.persist, type, type.uint32], 16, "usageIndex"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_usageIndex(this);
    }
    /** m_name.m_type (Tr2ParticleElementDeclarationName::Type) [READWRITE, PERSIST, ENUM] */
    elementType = _init_elementType(this, 4);

    /** m_name.m_name (std::string) [READWRITE, PERSIST] */
    customName = (_init_extra_elementType(this), _init_customName(this, ""));

    /** m_dimension (uint32_t) [READWRITE, PERSIST] */
    dimension = (_init_extra_customName(this), _init_dimension(this, 1));

    /** m_usedByGPU (bool) [READWRITE, PERSIST] */
    usedByGPU = (_init_extra_dimension(this), _init_usedByGPU(this, true));

    /** m_usageIndex (uint32_t) [READWRITE, PERSIST] */
    usageIndex = (_init_extra_usedByGPU(this), _init_usageIndex(this, 0));

    /** Returns Carbon's fixed dimensions for built-in particle semantics. */
    GetDimension() {
      switch (this.elementType) {
        case _Tr2ParticleElementDe.Type.LIFETIME:
          return 2;
        case _Tr2ParticleElementDe.Type.POSITION:
        case _Tr2ParticleElementDe.Type.VELOCITY:
          return 3;
        case _Tr2ParticleElementDe.Type.MASS:
          return 1;
        default:
          return Math.max(1, Math.min(4, Math.trunc(this.dimension) || 1));
      }
    }

    /**
     * Returns the authored custom name for CUSTOM elements, and the semantic's
     * enum name for the built-in types.
     */
    GetName() {
      return this.elementType === _Tr2ParticleElementDe.Type.CUSTOM ? this.customName : Object.keys(_Tr2ParticleElementDe.Type).find(name => _Tr2ParticleElementDe.Type[name] === this.elementType) ?? "";
    }
  }];
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

export { _Tr2ParticleElementDe as Tr2ParticleElementDeclaration };
//# sourceMappingURL=Tr2ParticleElementDeclaration.js.map
